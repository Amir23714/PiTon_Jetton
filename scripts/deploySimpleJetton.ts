import { toNano } from '@ton/core';
import { SimpleJetton } from '../wrappers/JettonMaster';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const simpleJetton = provider.open(SimpleJetton.createFromConfig({}, await compile('SimpleJetton')));

    await simpleJetton.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(simpleJetton.address);

    // run methods on `simpleJetton`
}
