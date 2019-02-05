Dockerized snax instance for development and testing.  This container
is designed to reset its blockchain and wallet state upon shutdown.

# Start snaxnoded

Starting and stopping an snax instance:

```js
./up.sh
docker-compose down
```

# Load commands like `clisnax`

```bash
. ./dockrc.sh
```

The [SNAX developer docs](https://developers.snax/snax-snaxnode/docs/docker-quickstart) uses a `clisnax` alias too.  If you see “No such container: snax”, run ‘unalias clisnax’ and try again.

# Unit Test

Run all unit test in a temporary instance.  Note, this script will run
`npm install` in the snaxjs directory.

`./run_tests.sh`

# Running container

After ./up.sh

```bash
docker exec docker_snaxnoded_1 ls /opt/snax/bin
docker exec docker_snaxnoded_1 ls /contracts
docker cp docker_snaxnoded_1:/opt/snax/bin/snaxnode .

# Or setup an environment:
. ./dockerc.sh
kxd ls /opt/snax/bin
clisnax --help
```

# Stopped container

```bash
# Note, update release
docker run --rm -it snax/snax:latest ls /opt/snax/bin
docker run -v "$(pwd):/share" --rm -it snax/snax:latest cp /opt/snax/bin/snaxnode /share
```

