export const SNOWFLAKE_TYPE_MAP: Record<string, number> = {
  TEXT: 25,
  VARCHAR: 1043,
  CHAR: 18,
  BOOLEAN: 16,
  NUMBER: 1700,
  FLOAT: 701,
  INTEGER: 23,
  INT: 23,
  BIGINT: 20,
  SMALLINT: 21,
  DATE: 1082,
  TIMESTAMP_NTZ: 1114,
  TIMESTAMP_LTZ: 1184,
  TIMESTAMP_TZ: 1186,
  VARIANT: 2950,
  OBJECT: 114,
  ARRAY: 1007,
  BINARY: 17,
  UNKNOWN: 0,
} as const;

export const AppUpdateTrackURL ='https://dbt-studio-tracker.adaptivescale.workers.dev/api/track';
