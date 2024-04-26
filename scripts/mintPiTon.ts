import { Address, Cell, beginCell, contractAddress, fromNano, toNano } from '@ton/core';
import { hash } from '../build/JettonMaster.compiled.json';
import { getHttpV4Endpoint } from '@orbs-network/ton-access';
import { TonClient4 } from '@ton/ton';
import qs from 'qs';
import qrcode from 'qrcode-terminal';

const OWNER_ADDRESS: string = '0QAAeHjRVfqPfRIjkPlxcv-OAffJUfAxWSu6RFli4FUeUCRn';
const CONTRACT_ADDRESS: string = 'EQA6wqQuvbjXk3bIm54ZABrIApjimtsoP5tQDI5Z7-HnebQD';

async function onchainTestScript() {
    console.log('Contract address : ', CONTRACT_ADDRESS);

    const address: Address = Address.parse(CONTRACT_ADDRESS);

    // Client configuration
    const endpoint = await getHttpV4Endpoint({
        network: 'testnet',
    });
    const client4 = new TonClient4({ endpoint });

    let latestBlock = await client4.getLastBlock();
    let status = await client4.getAccount(latestBlock.last.seqno, address);

    if (status.account.state.type !== 'active') {
        console.log('Contract is not active');
        return;
    }

    // QR-code for deposit to participating in raffle generation
    const contract_address: string = address.toString({ testOnly: process.env.TESTNET ? true : false });

    const msg_body = beginCell().storeUint(21, 32).storeUint(0, 64).endCell();
    const tons_to_mint = toNano('1');

    let link =
        `https://app.tonkeeper.com/transfer/` +
        contract_address +
        '?' +
        qs.stringify({
            amount: tons_to_mint.toString(10),
            bin: msg_body.toBoc({ idx: false }).toString('base64'),
        });

    console.log('Scan QR-code to mint 100 PiTons');
    qrcode.generate(link, { small: true }, (code) => {
        console.log(code);
    });
}

onchainTestScript();
