# Matching service (SourceAFIS)

The production matcher is **`matching-java`**: a small Javalin HTTP service wrapping **SourceAFIS for Java** (`com.machinezoo.sourceafis:sourceafis`).

- `POST /extract` — fingerprint image → serialized template (base64)
- `POST /match` — probe vs candidate templates → score
- `POST /quality` — heuristic 0–100 quality score (MVP; replace with ONNX/CNN later)

Build and run:

```bash
cd services/matching-java
mvn -q package
java -jar target/matching-service-0.1.0.jar
```

Default port **5050** (`PORT` env to override). Point `MATCHING_SERVICE_URL` in the API at this base URL.
