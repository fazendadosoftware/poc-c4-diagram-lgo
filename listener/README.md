## C4 diagram updater

### Requirements
The following Application Settings must be defined in your Azure deployment:
* LEANIX_INSTANCE
* LEANIX_APITOKEN

### Example trigger command:
```bash
curl -X POST -H "Content-Type: application/json" -d @FILENAME DESTINATION
```

```bash
curl -X POST -H "Content-Type: application/json" -d @./test.json http://localhost:7071/api/listener
```