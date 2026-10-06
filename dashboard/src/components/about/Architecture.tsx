import styles from "./Architecture.module.css";

const STAGES = [
  { title: "Replayer", sub: "Python process that publishes one telemetry message per tug per second." },
  { title: "IoT Core", sub: "Receives each message on an MQTT topic per tug." },
  { title: "Lambda ingest", sub: "Validates messages and fans them out to storage and subscribers." },
  { title: "DynamoDB and S3", sub: "Live state per tug in DynamoDB; tug-day JSON and the summary in S3." },
  { title: "WebSocket API", sub: "Sends a snapshot on connect, then the telemetry stream." },
  { title: "Dashboard", sub: "This console. Reads static JSON or the WebSocket stream with the same components." },
  { title: "Rerun recordings", sub: "One .rrd file per tug-day in S3, opened on demand by the inspector." },
] as const;

/** The data path as a vertical list of stages. */
export default function Architecture() {
  return (
    <ol className={styles.list} aria-label="Architecture, from the replayer to the dashboard">
      {STAGES.map((s) => (
        <li key={s.title} className={styles.stage}>
          <span className={styles.stageTitle}>{s.title}</span>
          <span className={styles.stageSub}>{s.sub}</span>
        </li>
      ))}
    </ol>
  );
}
