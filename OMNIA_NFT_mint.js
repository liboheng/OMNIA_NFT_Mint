const { EvmTxUtils, ExcelDataUtils, Time } = require("cryptojsutils");
const axios = require('axios');

const OP_RPC = 'https://rpc.ankr.com/optimism';
const ominxContractAddress = '0xd12999440402d30f69e282d45081999412013844';
const abi = require('./abi.json');
const {randomInRange} = require("cryptojsutils/Utils/Random");
const file = './MintWalletData.xlsx';
const gasLimit = 169501;
const maxPriorityFeePerGas = '10000000'; // 0.00000001 gwei
const maxFeePerGas = '379000000'; // 0.000000379 gwei
const maxMintAmount = 20;

const evmUtils = new EvmTxUtils(OP_RPC);

async function getNFTBalance(address) {
    try {
        const postData = [
            {
                method: "eth_call",
                params: [
                    {
                        to: ominxContractAddress,
                        data: `0x70a08231000000000000000000000000${address.toLowerCase().replace(/^0x/, '')}`
                    },
                    "latest"
                ],
                id: 2,
                jsonrpc: "2.0"
            }
        ];

        const config = {
            method: 'post',
            maxBodyLength: Infinity,
            url: OP_RPC,
            headers: {
                'Content-Type': 'application/json'
            },
            data: postData
        };

        const response = await axios.request(config);
        const balance = parseInt(response.data[0].result, 16);
        console.log('\x1b[32m%s\x1b[0m', `OMNIA NFT Balance: ${balance}`);
        return balance;
    } catch (error) {
        console.error(error);
        return 0;
    }
}

async function mint(privateKey, mintAmount) {
    try {
        console.log('\x1b[32m%s\x1b[0m', `mint OMINX NFT数量 ${mintAmount}`);
        const methodParams = [mintAmount];
        const encodedData = evmUtils.web3.eth.abi.encodeFunctionCall(abi[0], methodParams);
        const success = await evmUtils.sendTransaction(privateKey, ominxContractAddress, encodedData, gasLimit, maxPriorityFeePerGas, maxFeePerGas);
        return success;
    } catch (error) {
        console.error(error);
        return false;
    }
}

async function main() {
    const dataList = await ExcelDataUtils.getExcelDataList(file);
    const delay = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const [id, data] of dataList.entries()) {
        const privateKey = data.privateKey;
        const address = await evmUtils.getAddressByPrivateKey(privateKey);
        const ethBalance = await evmUtils.getBalanceByRPC(address);

        if (ethBalance < 0.0002) {
            console.log('\x1b[32m%s\x1b[0m', `ID ${id + 1} ETH余额不足`);
        } else {
            const balance = await getNFTBalance(address);
            const mintAmount = maxMintAmount - balance;

            if (mintAmount > 0) {
                data.mintSuccess = await mint(privateKey, mintAmount);
                await ExcelDataUtils.updateOneDataInExcel(dataList, id + 1, data, file);
                console.log('\x1b[32m%s\x1b[0m', `已经完成ID ${id + 1}`);
                await delay(randomInRange(10000,20000)); // 20 seconds delay
            }
        }
    }

    console.log('\x1b[32m%s\x1b[0m', `已经全部完成`);
}

main();
