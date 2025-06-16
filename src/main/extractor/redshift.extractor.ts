/* eslint-disable no-restricted-syntax, no-await-in-loop, consistent-return */
import { Client } from 'pg';
import { Column, Table } from '../../types/backend';

export default class RedshiftExtractor {
  private client: Client;

  constructor(config: {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
    ssl?: boolean;
    sslrootcert?: string;
  }) {
    // Build PostgreSQL client config with SSL support
    const clientConfig: any = {
      user: config.user,
      host: config.host,
      database: config.database,
      password: config.password,
      port: config.port,
      connectionTimeoutMillis: 15000, // 15 second timeout for Redshift
    };

    // Add SSL configuration - default to SSL for Redshift
    if (config.ssl !== false) { // Default to SSL unless explicitly disabled
      clientConfig.ssl = {
        rejectUnauthorized: false, // Use permissive SSL by default
        ...(config.sslrootcert && { ca: require('fs').readFileSync(config.sslrootcert) }),
      };
    }

    this.client = new Client(clientConfig);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  private async getSchemas(): Promise<string[]> {
    // Try multiple approaches to get schemas since Redshift might have different permissions
    const queries = [
      // Standard information_schema query
      `SELECT schema_name
       FROM information_schema.schemata
       WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast', 'pg_temp_1')`,

      // Alternative query using pg_namespace (might work better in Redshift)
      `SELECT nspname as schema_name
       FROM pg_namespace
       WHERE nspname NOT LIKE 'pg_%'
       AND nspname != 'information_schema'`,

      // Simple query to get current schema if others fail
      `SELECT current_schema() as schema_name`
    ];

    for (const query of queries) {
      try {
        const res = await this.client.query(query);

        if (res.rows && res.rows.length > 0) {
          const schemas = res.rows.map((row) => row.schema_name).filter(Boolean);
          if (schemas.length > 0) {
            return schemas;
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Schema query failed: ${errorMessage}`);
        continue;
      }
    }

    // If all queries fail, default to 'public' schema
    return ['public'];
  }

  private async getTables(schema: string): Promise<string[]> {
    const res = await this.client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE';`,
      [schema],
    );
    const tables = res.rows.map((row) => row.table_name);
    return tables;
  }

  private async getViews(schema: string): Promise<string[]> {
    const res = await this.client.query(
      `SELECT table_name FROM information_schema.views
       WHERE table_schema = $1;`,
      [schema],
    );
    const views = res.rows.map((row) => row.table_name);
    return views;
  }

  private async getDetailedColumns(
    schema: string,
    table: string,
  ): Promise<Column[]> {
    const res = await this.client.query(
      `
      SELECT
        c.column_name,
        c.data_type,
        c.ordinal_position,
        c.is_nullable,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.column_default,
        EXISTS (
          SELECT 1
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
            AND tc.table_schema = c.table_schema
            AND tc.table_name = c.table_name
            AND kcu.column_name = c.column_name
        ) AS is_primary
      FROM information_schema.columns c
      WHERE c.table_schema = $1 AND c.table_name = $2
      ORDER BY c.ordinal_position;
      `,
      [schema, table],
    );

    return res.rows.map((row, index) => {
      const autoincrement = row.column_default?.includes('identity') ||
                           row.column_default?.includes('nextval') || false;
      return {
        name: row.column_name,
        typeName: row.data_type,
        ordinalPosition: row.ordinal_position,
        primaryKeySequenceId: row.is_primary ? index + 1 : 0,
        columnDisplaySize:
          row.character_maximum_length || row.numeric_precision || 0,
        scale: row.numeric_scale || 0,
        precision: row.numeric_precision || 0,
        columnProperties: [],
        autoincrement,
        primaryKey: row.is_primary,
        nullable: row.is_nullable === 'YES',
      };
    });
  }

  async extractSchema(): Promise<{ tables: Table[] }> {
    const schemas = await this.getSchemas();
    const allTables: Table[] = [];

    for (const schema of schemas) {
      const tables = await this.getTables(schema);
      for (const table of tables) {
        const columns = await this.getDetailedColumns(schema, table);
        allTables.push({
          name: table,
          type: 'TABLE',
          schema,
          columns,
        });
      }

      const views = await this.getViews(schema);
      for (const view of views) {
        const columns = await this.getDetailedColumns(schema, view);
        allTables.push({
          name: view,
          type: 'VIEW',
          schema,
          columns,
        });
      }
    }

    return { tables: allTables };
  }
}
