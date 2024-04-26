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

export type JettonContent = {
    uri: string;
};

export type MasterMessage = {
    jetton_amount: number;
};

export type JettonMasterConfig = {
    totalSupply: number;
    adminAddress: Address;
    content: JettonContent;
    jettonWalletCode: Cell;
    masterMessage: MasterMessage;
};

export function jettonContentConfigToCell(config: JettonContent): Cell {
    return beginCell().storeUint(OFFCHAIN_CONTENT_PREFIX, 8).storeStringTail(config.uri).endCell();
}

export function masterMessageConfigToCell(config: MasterMessage): Cell {
    return beginCell().storeUint(MASTER_MSG_OPCODE, 32).storeUint(666, 64).storeCoins(config.jetton_amount).endCell();
}

export function jettonMasterConfigToCell(config: JettonMasterConfig): Cell {
    const content_master_msg = beginCell()
        .storeRef(jettonContentConfigToCell(config.content))
        .storeRef(masterMessageConfigToCell(config.masterMessage))
        .endCell();

    return beginCell()
        .storeCoins(toNano(config.totalSupply))
        .storeAddress(config.adminAddress)
        .storeRef(config.jettonWalletCode)
        .storeRef(content_master_msg)
        .endCell();
}

export class JettonMaster implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new JettonMaster(address);
    }

    static createFromConfig(config: JettonMasterConfig, code: Cell, workchain = 0) {
        const data = jettonMasterConfigToCell(config);
        const init = { code, data };
        return new JettonMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMintRequest(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(21, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendChangeAdminRequest(provider: ContractProvider, via: Sender, value: bigint, new_owner: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(1, 64).storeAddress(new_owner).endCell(),
        });
    }

    // GET methods

    async getJettonData(provider: ContractProvider) {
        const { stack } = await provider.get('get_jetton_data', []);

        return {
            total_supply: stack.readNumber(),
            mintable: stack.readNumber(),
            admin_address: stack.readAddress(),
            jetton_content: stack.readCell(),
            jetton_wallet_code: stack.readCell(),
        };
    }

    async getWalletAddress(provider: ContractProvider, target_address: Address) {
        const tuple_builder = new TupleBuilder();
        tuple_builder.writeAddress(target_address);
        const { stack } = await provider.get('get_wallet_address', tuple_builder.build());

        return stack.readAddress();
    }
}
