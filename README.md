# SimpleJetton

## Jetton is already deployed on TON testnet

Jetton name - PiTon (jPTN)
Simple token created in educational purposes.

**You can find it by** [this link](https://testnet.tonscan.org/address/EQA6wqQuvbjXk3bIm54ZABrIApjimtsoP5tQDI5Z7-HnebQD)


## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

-   `piton_UML.pdf` - UML diagram of Jetton's working process.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Check Tests coverage
`npm run test::coverage`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
