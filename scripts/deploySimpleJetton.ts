import { Address, Cell, toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { JettonContent, JettonMasterConfig, MasterMessage, JettonMaster } from '../wrappers/JettonMaster';

const JETTON_OFFCHAIN_METADATA =
    'https://raw.githubusercontent.com/Amir23714/ProjectConfigurations/main/PiTon_Jetton/PiTon_metadata.json';

const ADMIN_ADDRESS = '0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn';
const tonsToDeploy: bigint = toNano('0.01');

let JettonMasterContractCode: Cell;
let JettonWalletContractCode: Cell;

export async function run(provider: NetworkProvider) {
    JettonMasterContractCode = await compile('JettonMaster');
    JettonWalletContractCode = await compile('JettonWallet');

    const jetton_content: JettonContent = {
        uri: JETTON_OFFCHAIN_METADATA,
    };

    const master_msg: MasterMessage = {
        jetton_amount: 100,
    };

    const jetton_master_data: JettonMasterConfig = {
        totalSupply: 0,
        adminAddress: Address.parse(ADMIN_ADDRESS),
        content: jetton_content,
        jettonWalletCode: JettonWalletContractCode,
        masterMessage: master_msg,
    };
    const jettonMaster = provider.open(JettonMaster.createFromConfig(jetton_master_data, JettonMasterContractCode));

    await jettonMaster.sendDeploy(provider.sender(), tonsToDeploy);

    await provider.waitForDeploy(jettonMaster.address);
}
