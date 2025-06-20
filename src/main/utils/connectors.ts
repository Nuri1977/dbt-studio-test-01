/* eslint-disable prefer-promise-reject-errors, consistent-return */
import pg from 'pg';
import snowflake from 'snowflake-sdk';
import { BigQuery } from '@google-cloud/bigquery';
import { DuckDBInstance } from '@duckdb/node-api';
import { DBSQLClient } from '@databricks/sql';
import fs from 'fs';
import {
  PostgresConnection,
  QueryResponseType,
  SnowflakeConnection,
  DatabricksConnection,
  BigQueryConnection,
  BigQueryTestResponse,
  DuckDBConnection,
  RedshiftConnection,
} from '../../types/backend';
import { SNOWFLAKE_TYPE_MAP } from './constants';

export async function testPostgresConnection(
  config: PostgresConnection,
): Promise<boolean> {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 5000,
  });

  await client.connect();
  const result = await client.query('SELECT 1 as connection_test');
  await client.end();
  return result.rows[0]?.connection_test === 1;
}

export async function testRedshiftConnection(
  config: RedshiftConnection,
): Promise<boolean> {
  const clientConfig: any = {
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 15000, // Increased timeout for Redshift
  };

  // Enable SSL by default for Redshift (required for Redshift Serverless)
  if (config.ssl !== false) {
    clientConfig.ssl = {
      rejectUnauthorized: false, // Use permissive SSL by default
      ...(config.sslrootcert && { ca: fs.readFileSync(config.sslrootcert) }),
    };
  }

  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    const result = await client.query('SELECT 1 as connection_test');
    await client.end();
    return result.rows[0]?.connection_test === 1;
  } catch (error) {
    return false;
  }
}

export const executePostgresQuery = async (
  config: PostgresConnection,
  query: string,
): Promise<QueryResponseType> => {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    const result = await client.query(query);
    return {
      success: true,
      data: result.rows,
      fields: result.fields.map((f) => ({ name: f.name, type: f.dataTypeID })),
      rowCount: result.rowCount ?? undefined, // Convert null to undefined
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  } finally {
    await client.end();
  }
};

export const executeRedshiftQuery = async (
  config: RedshiftConnection,
  query: string,
): Promise<QueryResponseType> => {
  const clientConfig: any = {
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: 15000, // Increased timeout for Redshift
  };

  // Enable SSL by default for Redshift (required for Redshift Serverless)
  if (config.ssl !== false) {
    clientConfig.ssl = {
      rejectUnauthorized: false, // Use permissive SSL by default
      ...(config.sslrootcert && { ca: fs.readFileSync(config.sslrootcert) }),
    };
  }

  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    const result = await client.query(query);
    return {
      success: true,
      data: result.rows,
      fields: result.fields.map((f) => ({ name: f.name, type: f.dataTypeID })),
    };
  } catch (err: any) {
    return { success: false, error: err?.message };
  } finally {
    await client.end();
  }
};

const createSnowflakeConnection = (config: SnowflakeConnection) => {
  return snowflake.createConnection({
    account: config.account.split('.')[0],
    username: config.username,
    password: config.password,
    warehouse: config.warehouse,
    database: config.database,
    schema: config.schema,
    role: config.role,
  });
};

export async function testSnowflakeConnection(
  config: SnowflakeConnection,
): Promise<boolean> {
  const connection = createSnowflakeConnection(config);

  const connectPromise = () =>
    new Promise<void>((resolve, reject) => {
      connection.connect((err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });

  const executePromise = (sql: string) =>
    new Promise<any[]>((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, _stmt, rows) => {
          if (err) {
            return reject(err);
          }
          resolve(rows || []);
        },
      });
    });

  try {
    await connectPromise();
    const rows = await executePromise('SELECT 1 AS connection_test');
    return rows[0]?.CONNECTION_TEST === 1;
  } catch (error) {
    return false;
  } finally {
    connection.destroy(() => {});
  }
}

export const executeSnowflakeQuery = async (
  config: SnowflakeConnection,
  query: string,
): Promise<QueryResponseType> => {
  const connection = createSnowflakeConnection(config);

  return new Promise((resolve) => {
    connection.connect((err) => {
      if (err) {
        return resolve({ success: false, error: err.message });
      }

      connection.execute({
        sqlText: query,
        complete: (error, stmt, rows) => {
          connection.destroy(() => {});
          if (error) {
            return resolve({ success: false, error: error.message });
          }

          const fields =
            stmt?.getColumns().map((col) => ({
              name: col.getName(),
              type: SNOWFLAKE_TYPE_MAP[col.getType().toUpperCase()] || 0,
            })) || [];

          resolve({
            success: true,
            data: rows,
            fields,
          });
        },
      });
    });
  });
};

export async function testDatabricksConnection(
  config: DatabricksConnection,
): Promise<boolean> {
  const client = new DBSQLClient();

  try {
    const connection = await client.connect({
      token: config.token,
      host: config.host,
      path: config.httpPath,
    });

    const session = await connection.openSession();
    const queryOperation = await session.executeStatement(
      'SELECT 1 as connection_test',
      {
        runAsync: true,
      },
    );

    const result = await queryOperation.fetchAll();
    await queryOperation.close();
    await session.close();
    await client.close();

    return result.length > 0 && (result[0] as any)?.connection_test === 1;
  } catch (error) {
    return false;
  }
}

export const executeDatabricksQuery = async (
  config: DatabricksConnection,
  query: string,
): Promise<QueryResponseType> => {
  const client = new DBSQLClient();

  try {
    const connection = await client.connect({
      token: config.token, // Use token instead of password
      host: config.host,
      path: config.httpPath,
    });

    const session = await connection.openSession();
    const queryOperation = await session.executeStatement(query, {
      runAsync: true,
    });

    const result = await queryOperation.fetchAll();
    await queryOperation.close();
    await session.close();
    await client.close();

    // For now, we'll return basic field info since Databricks doesn't provide detailed type info easily
    const fields =
      result.length > 0
        ? Object.keys(result[0] as object).map((name, index) => ({
            name,
            type: index,
          }))
        : [];

    return {
      success: true,
      data: result as any[], // Cast to any[] to match expected type
      fields,
    };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
};

export async function testBigQueryConnection(
  config: BigQueryConnection,
): Promise<BigQueryTestResponse> {
  if (config.method !== 'service-account' || !config.keyfile) {
    throw new Error('Only service account authentication is supported');
  }

  const bigqueryConfig: any = {
    projectId: config.project,
  };

  try {
    const credentials = JSON.parse(config.keyfile);
    bigqueryConfig.credentials = credentials;
  } catch (err) {
    throw new Error('Invalid service account key JSON format');
  }

  if (config.location) {
    bigqueryConfig.location = config.location;
  }

  const client = new BigQuery(bigqueryConfig);

  try {
    await client.query('SELECT 1');
    return {
      success: true,
    };
  } catch (err: any) {
    if (err.code === 403) {
      throw new Error(
        'Permission denied. Please check your credentials and project access.',
      );
    } else if (err.code === 404) {
      throw new Error('Project not found. Please verify your Project ID.');
    } else if (err.code === 401) {
      throw new Error(
        'Authentication failed. Please check your service account key.',
      );
    }
    throw err;
  }
}

export const executeBigQueryQuery = async (
  config: BigQueryConnection,
  query: string,
): Promise<QueryResponseType> => {
  if (config.method !== 'service-account' || !config.keyfile) {
    return {
      success: false,
      error: 'Only service account authentication is supported',
    };
  }

  const bigqueryConfig: any = {
    projectId: config.project,
  };

  try {
    const credentials = JSON.parse(config.keyfile);
    bigqueryConfig.credentials = credentials;
  } catch (err) {
    return {
      success: false,
      error: 'Invalid service account key JSON format',
    };
  }

  if (config.location) {
    bigqueryConfig.location = config.location;
  }

  const client = new BigQuery(bigqueryConfig);

  try {
    const options: any = {
      query,
      location: config.location,
    };

    if (config.priority === 'batch') {
      options.priority = 'BATCH';
    }

    const [rows] = await client.query(options);
    const fields =
      rows.length > 0
        ? Object.keys(rows[0]).map((name) => ({
            name,
            type: typeof rows[0][name] === 'number' ? 1 : 0,
          }))
        : [];

    return {
      success: true,
      data: rows,
      fields,
    };
  } catch (err: any) {
    let errorMessage = err.message;

    if (err.code === 403) {
      errorMessage =
        'Permission denied. Please check your credentials and project access.';
    } else if (err.code === 404) {
      errorMessage =
        'Project or dataset not found. Please verify your Project ID and dataset.';
    } else if (err.code === 401) {
      errorMessage =
        'Authentication failed. Please check your service account key.';
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

export async function testDuckDBConnection(
  config: DuckDBConnection,
): Promise<boolean> {
  let instance: any = null;
  let connection: any = null;

  try {
    if (!config.database_path) {
      console.error(
        '❌ DuckDB connection test failed: No database path provided',
      );
      return false;
    }

    try {
      const stats = fs.statSync(config.database_path);
      if (stats.isDirectory()) {
        console.error(
          '❌ DuckDB connection test failed: Path is a directory, not a file',
        );
        return false;
      }
    } catch (error) {
      // File doesn't exist yet - DuckDB will create it
    }

    // Create instance and connection
    instance = await DuckDBInstance.create(config.database_path);
    connection = await instance.connect();

    try {
      const result = await connection.run('SELECT 1 as connection_test');
      const rows = await result.getRows();

      let success = false;
      if (rows.length > 0) {
        if (Array.isArray(rows[0])) {
          success = rows[0][0] === 1;
        } else if (typeof rows[0] === 'object' && rows[0] !== null) {
          success = (rows[0] as any).connection_test === 1;
        } else {
          success = rows[0] === 1;
        }
      }

      return success;
    } catch (queryError) {
      console.error('❌ Error during query execution:', queryError);
      return false;
    }
  } catch (error: any) {
    console.error('❌ DuckDB database creation/connection failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    if (error.message?.includes('Is a directory')) {
      const errorMsg =
        'The selected path is a directory. Please select a DuckDB file (.duckdb)';
      console.error('🔍 Specific error:', errorMsg);
      throw new Error(errorMsg);
    }

    if (error.message?.includes('Conflicting lock')) {
      const pidMatch = error.message.match(/PID (\d+)/);
      const pid = pidMatch ? pidMatch[1] : 'unknown';
      const errorMsg = `The DuckDB file is locked by another process (PID: ${pid}). Please close any DuckDB CLI sessions or run: kill ${pid}`;
      console.error('🔍 Specific error:', errorMsg);
      throw new Error(errorMsg);
    }

    if (error.message?.includes('Permission denied')) {
      const errorMsg =
        'Permission denied. Please check file permissions or select a different location.';
      console.error('🔍 Specific error:', errorMsg);
      throw new Error(errorMsg);
    }

    throw error;
  } finally {
    // Ensure proper cleanup in all cases
    try {
      if (connection) {
        // Close connection first
        if (typeof connection.close === 'function') {
          await connection.close();
        } else if (typeof connection.closeSync === 'function') {
          connection.closeSync();
        }
      }
    } catch (closeError) {
      console.warn('Warning: Error closing DuckDB connection:', closeError);
    }

    try {
      if (instance) {
        if (typeof instance.close === 'function') {
          await instance.close();
        } else if (typeof instance.closeSync === 'function') {
          instance.closeSync();
        } else if (typeof instance.terminate === 'function') {
          await instance.terminate();
        }
      }
    } catch (instanceError) {
      console.warn('Warning: Error closing DuckDB instance:', instanceError);
    }
  }
}

export const executeDuckDBQuery = async (
  config: DuckDBConnection,
  query: string,
): Promise<QueryResponseType> => {
  let instance: any = null;
  let connection: any = null;

  try {
    instance = await DuckDBInstance.create(config.database_path);
    connection = await instance.connect();

    const result = await connection.run(query);
    const rows = await result.getRows();

    // Extract field information from the result schema
    const fields =
      rows.length > 0
        ? Object.keys(rows[0] as any).map((name, index) => ({
            name,
            type: index, // Simple type mapping for now
          }))
        : [];

    return {
      success: true,
      data: rows as any[],
      fields,
    };
  } catch (error: any) {
    console.error('❌ DuckDB query execution failed:', error);
    return {
      success: false,
      error: error?.message || 'Unknown error occurred during query execution',
    };
  } finally {
    // Ensure proper cleanup in all cases
    try {
      if (connection) {
        // Close connection first
        if (typeof connection.close === 'function') {
          await connection.close();
        } else if (typeof connection.closeSync === 'function') {
          connection.closeSync();
        }
      }
    } catch (closeError) {
      console.warn('Warning: Error closing DuckDB connection:', closeError);
    }

    try {
      if (instance) {
        // Close instance to release the database lock
        if (typeof instance.close === 'function') {
          await instance.close();
        } else if (typeof instance.closeSync === 'function') {
          instance.closeSync();
        } else if (typeof instance.terminate === 'function') {
          await instance.terminate();
        }
      }
    } catch (instanceError) {
      console.warn('Warning: Error closing DuckDB instance:', instanceError);
    }
  }
};
