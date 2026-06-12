import { InfluxDB, WriteApi, QueryApi } from '@influxdata/influxdb-client';

const url = process.env.INFLUX_URL || 'http://localhost:8086';
const token = process.env.INFLUX_TOKEN || 'admin-token-12345';
const org = process.env.INFLUX_ORG || 'warehouse-org';
const bucket = process.env.INFLUX_BUCKET || 'warehouse_sensors';

class InfluxService {
  private influxDB: InfluxDB;
  private writeApi: WriteApi;
  private queryApi: QueryApi;

  constructor() {
    this.influxDB = new InfluxDB({ url, token });
    // Precision 'ns' for nanoseconds, standard for IoT sensor readings
    this.writeApi = this.influxDB.getWriteApi(org, bucket, 'ns');
    this.queryApi = this.influxDB.getQueryApi(org);
  }

  public getWriteApi(): WriteApi {
    return this.writeApi;
  }

  public getQueryApi(): QueryApi {
    return this.queryApi;
  }

  public getOrg(): string {
    return org;
  }

  public getBucket(): string {
    return bucket;
  }

  /**
   * Helper to run Flux query and return all results as an array of objects
   */
  public async query(fluxQuery: string): Promise<any[]> {
    const results: any[] = [];
    return new Promise((resolve, reject) => {
      this.queryApi.queryRows(fluxQuery, {
        next: (row, tableMeta) => {
          const o = tableMeta.toObject(row);
          results.push(o);
        },
        error: (err) => {
          reject(err);
        },
        complete: () => {
          resolve(results);
        },
      });
    });
  }

  public async close(): Promise<void> {
    await this.writeApi.close();
  }
}

export const influxService = new InfluxService();
export default influxService;
