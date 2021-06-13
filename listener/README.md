## C4 diagram updater

### Requirements
The following Application Settings must be defined in your Azure deployment:
* LEANIX_INSTANCE
* LEANIX_APITOKEN
* LEANIX_USERNAME (for basic auth)
* LEANIX_PASSWORD (for basic auth)

### Example trigger command (with basic authentication, username/password = LEANIX/LEANIX, throw error on fail, i.e. response not 200):
```bash
curl -X POST -H "Content-Type: application/json" -d @FILENAME DESTINATION -u "username:password" -f
```

```bash
curl -X POST -H "Content-Type: application/json" -d @./test.json http://localhost:7071/api/listener -u "LEANIX:LEANIX" -f
```