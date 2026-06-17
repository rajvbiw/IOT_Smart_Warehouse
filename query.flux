from(bucket: "warehouse_sensors")
  |> range(start: -24h)
  |> limit(n: 5)
