import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    toNano,
    TupleBuilder,
} from '@ton/core';

const OFFCHAIN_CONTENT_PREFIX = 0x01;
const MASTER_MSG_OPCODE = 0x178d4519;

export class JettonWallet implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonWallet(address);
    }

    async sendTransferRequest(
        provider: ContractProvider,
        via: Sender,
        value: bigint,
        jetton_amount: number,
        to_address: Address,
    ) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0xf8a7ea5, 32) // transfer() opcode
                .storeUint(1, 64) // query id
                .storeCoins(jetton_amount) // jetton amount
                .storeAddress(to_address) // destination address
                .storeAddress(via.address) // response address
                .storeUint(0, 1) // Hashmap
                // .storeRef(beginCell().endCell()) // custom payload
                .storeCoins(toNano('0.01')) // forward ton amount (to be sent to to_address)
                .storeUint(0, 1) // Hashmap
                // .storeRef(beginCell().endCell()) // forward ton payload
                .endCell(),
        });
    }

    async sendBurnRequest(provider: ContractProvider, via: Sender, value: bigint, jetton_amount: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x595f07bc, 32) // burn() opcode
                .storeUint(2, 64) // query id
                .storeCoins(jetton_amount) // jetton amount
                .storeAddress(via.address) // response address
                .storeUint(0, 1) // Hashmap
                // .storeRef(beginCell().endCell()) // custom payload
                .endCell(),
        });
    }

    // GET methods

    async getWalletData(provider: ContractProvider) {
        const { stack } = await provider.get('get_wallet_data', []);

        return {
            jetton_balance: stack.readNumber(),
            owner_address: stack.readAddress(),
            jetton_master_address: stack.readAddress(),
            jetton_wallet_code: stack.readCell(),
        };
    }
}
