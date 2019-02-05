# Root key (for SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV)
# 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

# Root public key (SNAX..5CV)
export owner_pubkey=SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV
export active_pubkey=SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV

function clisnax() {
  docker exec docker_kxd_1 clisnax -u http://snaxnoded:8888 --wallet-url http://localhost:8900 "$@"
}

function kxd() {
  docker exec docker_snaxnoded_1 kxd "$@"
}

function pkill() {
  docker exec docker_snaxnoded_1 pkill "$@"
}
