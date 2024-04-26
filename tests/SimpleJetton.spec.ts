import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, fromNano, toNano } from '@ton/core';
import { JettonContent, JettonMasterConfig, MasterMessage, JettonMaster } from '../wrappers/JettonMaster';
import { JettonWallet } from '../wrappers/JettonWallet';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

const JETTON_OFFCHAIN_METADATA =
    'https://raw.githubusercontent.com/Amir23714/ProjectConfigurations/main/PiTon_Jetton/PiTon_metadata.json';

const tonsToDeploy: bigint = toNano('0.01');
const tonsToMint: bigint = toNano('1');

function getJettonSandboxContract(blockchain: Blockchain, contract: JettonWallet) {
    return blockchain.openContract(contract);
}

describe('SimpleJetton', () => {
    let JettonMasterContractCode: Cell;
    let JettonWalletContractCode: Cell;

    beforeAll(async () => {
        JettonMasterContractCode = await compile('JettonMaster');
        JettonWalletContractCode = await compile('JettonWallet');
    });

    let blockchain: Blockchain;
    let ownerWallet: SandboxContract<TreasuryContract>;
    let jettonMasterContract: SandboxContract<JettonMaster>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        ownerWallet = await blockchain.treasury('deployer');

        const jetton_content: JettonContent = {
            uri: JETTON_OFFCHAIN_METADATA,
        };

        const master_msg: MasterMessage = {
            jetton_amount: 100,
        };

        const jetton_master_data: JettonMasterConfig = {
            totalSupply: 0,
            adminAddress: ownerWallet.address,
            content: jetton_content,
            jettonWalletCode: JettonWalletContractCode,
            masterMessage: master_msg,
        };

        jettonMasterContract = blockchain.openContract(
            JettonMaster.createFromConfig(jetton_master_data, JettonMasterContractCode),
        );

        const deployResult = await jettonMasterContract.sendDeploy(ownerWallet.getSender(), tonsToDeploy);

        expect(deployResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: jettonMasterContract.address,
            deploy: true,
            success: true,
        });
    });

    it('Master Contract should deploy and its Data must be uncorrupted', async () => {
        const masterContractData_afterDeploy = await jettonMasterContract.getJettonData();

        expect(masterContractData_afterDeploy.total_supply).toBe(0);
        expect(masterContractData_afterDeploy.admin_address.toString()).toBe(ownerWallet.address.toString());
        expect(masterContractData_afterDeploy.jetton_wallet_code.toBoc()).toEqual(JettonWalletContractCode.toBoc());
    });

    it('User can mint jettons', async () => {
        const userOneWallet = await blockchain.treasury('userOne');

        const userOneMintResult = await jettonMasterContract.sendMintRequest(userOneWallet.getSender(), tonsToMint);

        expect(userOneMintResult.transactions).toHaveTransaction({
            from: userOneWallet.address,
            to: jettonMasterContract.address,
            success: true,
        });

        const userOneJettonWallet_address = await jettonMasterContract.getWalletAddress(userOneWallet.address);

        const userOneJettonWallet = getJettonSandboxContract(
            blockchain,
            JettonWallet.createFromAddress(userOneJettonWallet_address),
        );
        const userOneJettonWalletData = await userOneJettonWallet.getWalletData();

        expect(userOneJettonWalletData.jetton_balance).toEqual(100);
        expect(userOneJettonWalletData.jetton_master_address.toString()).toBe(jettonMasterContract.address.toString());
        expect(userOneJettonWalletData.owner_address.toString()).toEqual(userOneWallet.address.toString());
        expect(userOneJettonWalletData.jetton_wallet_code.toBoc()).toEqual(JettonWalletContractCode.toBoc());

        const masterContractData_afterFirstMint = await jettonMasterContract.getJettonData();

        expect(masterContractData_afterFirstMint.total_supply).toBe(100);
    });

    it('User can transfer jettons', async () => {
        const userOneWallet = await blockchain.treasury('userOne');
        const userOneMintResult = await jettonMasterContract.sendMintRequest(userOneWallet.getSender(), tonsToMint);

        expect(userOneMintResult.transactions).toHaveTransaction({
            from: userOneWallet.address,
            to: jettonMasterContract.address,
            success: true,
        });

        const userTwoWallet = await blockchain.treasury('userTwo');
        // const userTwoMintResult = await jettonMasterContract.sendMintRequest(userTwoWallet.getSender(), tonsToMint);

        // expect(userTwoMintResult.transactions).toHaveTransaction({
        //     from: userTwoWallet.address,
        //     to: jettonMasterContract.address,
        //     success: true,
        // });

        const userOneJettonWallet_address = await jettonMasterContract.getWalletAddress(userOneWallet.address);
        const userOneJettonWallet = getJettonSandboxContract(
            blockchain,
            JettonWallet.createFromAddress(userOneJettonWallet_address),
        );

        const userTwoJettonWallet_address = await jettonMasterContract.getWalletAddress(userTwoWallet.address);
        const userTwoJettonWallet = getJettonSandboxContract(
            blockchain,
            JettonWallet.createFromAddress(userTwoJettonWallet_address),
        );

        // console.log('User 1 address ', userOneWallet.address);
        // console.log('User 2 address ', userTwoWallet.address);
        // console.log('User 1 jetton address ', userOneJettonWallet_address);
        // console.log('User 2 jetton address ', userTwoJettonWallet_address);

        const userOneJettonWalletData_before_transfer = await userOneJettonWallet.getWalletData();

        const userOneBalance_before_transfer = await userOneWallet.getBalance();
        // console.log('User 1 jetton balance before transfer: ', userOneJettonWalletData_before_transfer.jetton_balance);

        const transferOneToTwoResult = await userOneJettonWallet.sendTransferRequest(
            userOneWallet.getSender(),
            toNano('1'),
            50,
            userTwoWallet.address,
        );

        expect(transferOneToTwoResult.transactions).toHaveTransaction({
            from: userOneWallet.address,
            to: userOneJettonWallet_address,
            success: true,
        });

        expect(transferOneToTwoResult.transactions).toHaveTransaction({
            from: userOneJettonWallet_address,
            to: userTwoJettonWallet_address,
            success: true,
        });

        expect(transferOneToTwoResult.transactions).toHaveTransaction({
            from: userTwoJettonWallet_address,
            to: userTwoWallet.address,
            success: true,
        });

        expect(transferOneToTwoResult.transactions).toHaveTransaction({
            from: userTwoJettonWallet_address,
            to: userOneWallet.address,
            success: true,
        });

        const userOneJettonWalletData_after_transfer = await userOneJettonWallet.getWalletData();
        const userTwoJettonWalletData_after_transfer = await userTwoJettonWallet.getWalletData();
        console.log(
            'User 1 spent ',
            fromNano(userOneBalance_before_transfer - (await userOneWallet.getBalance())),
            ' TONs for transfer',
        );
        // console.log('User 1 jetton balance after transfer: ', userOneJettonWalletData_after_transfer.jetton_balance);

        expect(userOneJettonWalletData_after_transfer.jetton_balance).toEqual(50);
        expect(userTwoJettonWalletData_after_transfer.jetton_balance).toEqual(50);
    });

    it('User can burn jettons', async () => {
        const userOneWallet = await blockchain.treasury('userOne');
        const userOneMintResult = await jettonMasterContract.sendMintRequest(userOneWallet.getSender(), tonsToMint);

        expect(userOneMintResult.transactions).toHaveTransaction({
            from: userOneWallet.address,
            to: jettonMasterContract.address,
            success: true,
        });

        const masterContractData_afterFirstMint = await jettonMasterContract.getJettonData();

        const userOneJettonWallet_address = await jettonMasterContract.getWalletAddress(userOneWallet.address);
        const userOneJettonWallet = getJettonSandboxContract(
            blockchain,
            JettonWallet.createFromAddress(userOneJettonWallet_address),
        );

        const userOneJettonWalletData_before_burn = await userOneJettonWallet.getWalletData();

        expect(masterContractData_afterFirstMint.total_supply).toBe(100);
        expect(userOneJettonWalletData_before_burn.jetton_balance).toEqual(100);

        const burnResult = await userOneJettonWallet.sendBurnRequest(userOneWallet.getSender(), toNano('1'), 100);

        expect(burnResult.transactions).toHaveTransaction({
            from: userOneWallet.address,
            to: userOneJettonWallet_address,
            success: true,
        });

        expect(burnResult.transactions).toHaveTransaction({
            from: userOneJettonWallet_address,
            to: jettonMasterContract.address,
            success: true,
        });

        expect(burnResult.transactions).toHaveTransaction({
            from: jettonMasterContract.address,
            to: userOneWallet.address,
            success: true,
        });

        const userOneJettonWalletData_after_burn = await userOneJettonWallet.getWalletData();
        const masterContractData_after_burn = await jettonMasterContract.getJettonData();

        expect(userOneJettonWalletData_after_burn.jetton_balance).toEqual(0);
        expect(masterContractData_after_burn.total_supply).toBe(0);

        // Withdraw by admin
        const ownerBalance_before_withdraw = await ownerWallet.getBalance();
        const withdrawResult = await jettonMasterContract.sendWithdrawRequest(ownerWallet.getSender(), toNano('0.01'));

        expect(withdrawResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: jettonMasterContract.address,
            success: true,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: jettonMasterContract.address,
            to: ownerWallet.address,
            success: true,
        });

        const ownerBalance_after_withdraw = await ownerWallet.getBalance();
        console.log(
            'Owner got ',
            fromNano(ownerBalance_after_withdraw - ownerBalance_before_withdraw),
            ' TONs as Royalty',
        );
    });

    it('Can change admin of Jetton Master', async () => {
        const jettonMasterData = await jettonMasterContract.getJettonData();
        const previous_admin = jettonMasterData.admin_address;

        const userOneWallet = await blockchain.treasury('userOne');

        const changeOwnerResult = await jettonMasterContract.sendChangeAdminRequest(
            ownerWallet.getSender(),
            toNano('0.01'),
            userOneWallet.address,
        );

        expect(changeOwnerResult.transactions).toHaveTransaction({
            from: ownerWallet.address,
            to: jettonMasterContract.address,
            success: true,
        });

        const jettonMasterData_updated = await jettonMasterContract.getJettonData();
        const new_admin = jettonMasterData_updated.admin_address;

        expect(new_admin.toString()).toBe(userOneWallet.address.toString());
    });
});
