set -o errexit
set -o xtrace

function process() {
  docker cp docker_snaxnoded_1:/contracts/${1}/${1}.abi .
  mv ${1}.abi ../src/schema/${1}.abi.json
}

process snax.token
process snax.system
