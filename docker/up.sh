#!/usr/bin/env bash
set -o errexit
. ./dockrc.sh

set -o xtrace

# Reset the volumes
docker-compose down

# Update docker
#docker-compose pull

# Start the server for testing
docker-compose up -d
docker-compose logs -f | egrep -v 'Produced block 0' &
sleep 2


clisnax wallet create --to-console
clisnax wallet import --private-key 5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3

# Create accounts must happen before snax.system is installed

# Test accounts (for snaxjs)
clisnax create account snax inita $owner_pubkey $active_pubkey
clisnax create account snax initb $owner_pubkey $active_pubkey
clisnax create account snax initc $owner_pubkey $active_pubkey

# System accounts for Nodsnaxd
clisnax create account snax snax.bpay $owner_pubkey $active_pubkey
clisnax create account snax snax.msig $owner_pubkey $active_pubkey
clisnax create account snax snax.names $owner_pubkey $active_pubkey
clisnax create account snax snax.ram $owner_pubkey $active_pubkey
clisnax create account snax snax.ramfee $owner_pubkey $active_pubkey
clisnax create account snax snax.saving $owner_pubkey $active_pubkey
clisnax create account snax snax.stake $owner_pubkey $active_pubkey
clisnax create account snax snax.token $owner_pubkey $active_pubkey
clisnax create account snax snax.vpay $owner_pubkey $active_pubkey

clisnax set contract snax.msig contracts/snax.msig -p snax.msig@active

# Deploy, create and issue SNAX token to snax.token
# clisnax create account snax snax.token $owner_pubkey $active_pubkey
clisnax set contract snax.token contracts/snax.token -p snax.token@active
clisnax push action snax.token create\
  '{"issuer":"snax.token", "maximum_supply": "1000000000.0000 SNAX"}' -p snax.token@active
clisnax push action snax.token issue\
  '{"to":"snax.token", "quantity": "10000.0000 SNAX", "memo": "issue"}' -p snax.token@active

# Either the snax.bios or snax.system contract may be deployed to the snax
# account.  System contain everything bios has but adds additional constraints
# such as ram and cpu limits.
# snax.* accounts  allowed only until snax.system is deployed
clisnax set contract snax contracts/snax.bios -p snax@active

# SNAX (main token)
clisnax transfer snax.token snax '1000 SNAX'
clisnax transfer snax.token inita '1000 SNAX'
clisnax transfer snax.token initb '1000 SNAX'
clisnax transfer snax.token initc '1000 SNAX'

# User-issued asset
clisnax push action snax.token create\
  '{"issuer":"snax.token", "maximum_supply": "1000000000.000 PHI"}' -p snax.token@active
clisnax push action snax.token issue\
  '{"to":"snax.token", "quantity": "10000.000 PHI", "memo": "issue"}' -p snax.token@active
clisnax transfer snax.token inita '100 PHI'
clisnax transfer snax.token initb '100 PHI'

# Custom asset
clisnax create account snax currency $owner_pubkey $active_pubkey
clisnax set contract currency contracts/snax.token -p currency@active
clisnax push action currency create\
  '{"issuer":"currency", "maximum_supply": "1000000000.0000 CUR"}' -p currency@active
clisnax push action currency issue '{"to":"currency", "quantity": "10000.0000 CUR", "memo": "issue"}' -p currency@active

clisnax push action currency transfer\
  '{"from":"currency", "to": "inita", "quantity": "100.0000 CUR", "memo": "issue"}' -p currency
