import Web3 from "web3";
import abi from "./abi/familynft.json" assert { type: "json" };
import PinataClient from "@pinata/sdk";
import dotenv from "dotenv";
import axios from "axios";
import { File, Web3Storage } from "web3.storage";
import { ethers } from "ethers";
dotenv.config();

const PINATA_SECRET = process.env.PINATA_SECRET;
const PINATA_KEY = process.env.PINATA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_LUKSO = process.env.PRIVATE_KEY_LUKSO;
const WEB3STORAGE_API_KEY = process.env.WEB3_STORAGE;
const pinata = new PinataClient(PINATA_KEY, PINATA_SECRET);
const web3storageclient = new Web3Storage({
  token: WEB3STORAGE_API_KEY,
  endpoint: new URL("https://api.web3.storage"),
});
// const web3 = new Web3("https://rpc.l16.lukso.network/");
const web3 = new Web3("https://rpc.ankr.com/eth_goerli");
// const myAccount = web3.eth.accounts.privateKeyToAccount(
//   "0xc2bd836122e9886b39d77d2865e434daeb08fd6e9a040a124b6174676d2a2231"
// );
const provider = new ethers.providers.JsonRpcProvider(
  "https://rpc.l16.lukso.network"
);
const myAccount = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
const signer = new ethers.Wallet(PRIVATE_KEY_LUKSO, provider);

web3.eth.accounts.wallet.add(myAccount.privateKey);

export const mintWallet = async (product, minter, size) => {
  try {
    // const contract = new web3.eth.Contract(
    //   abi.abi,
    //   "0x353AF3A24A39031DA7c99155f5e9f7Bf09A3C55E",
    //   { gas: 5_000_000, gasPrice: "1000000000" }
    // );
    // const contract = new web3.eth.Contract(
    //   abi.abi,
    //   "0x353AF3A24A39031DA7c99155f5e9f7Bf09A3C55E"
    //   // { gas: 5_000_000, gasPrice: "1000000000" }
    // );
    let contract = new ethers.Contract(
      "0x353AF3A24A39031DA7c99155f5e9f7Bf09A3C55E",
      abi.abi,
      signer
    );
    const totalSupply = await contract.totalSupply();
    console.log("total supply", parseInt(totalSupply));
    // let imgCIDs = {
    //   Biege: "QmUuNWg4W1xHujztXnmewZiotE4nkPUxwi6CueByo87LaE",
    //   Blue: "QmZEJboL7hKaq1CF1oC8QkZcyCXcx2LXR4v4rNf5GbQDb1",
    //   Brown: "QmTFMhv6f4LMnAxju2fva8ps7b7vDbs7RstSGfRAyBfkaB",
    //   Green: "QmZSzzXhgwcpm7V37nKKd9pFq6zz77wMG6Rjf6wPrjFAiT",
    //   Olive: "QmP7dh8np2CucK7g2s1B9rxZuKRzQDGwpDBUYzofKDuBdb",
    // };
    // const imgLink = `https://gateway.pinata.cloud/ipfs/${
    //   product === "Beige"
    //     ? "QmUuNWg4W1xHujztXnmewZiotE4nkPUxwi6CueByo87LaE"
    //     : product === "Blue"
    //     ? "QmZEJboL7hKaq1CF1oC8QkZcyCXcx2LXR4v4rNf5GbQDb1"
    //     : product === "Brown"
    //     ? "QmTFMhv6f4LMnAxju2fva8ps7b7vDbs7RstSGfRAyBfkaB"
    //     : product === "Green"
    //     ? "QmZSzzXhgwcpm7V37nKKd9pFq6zz77wMG6Rjf6wPrjFAiT"
    //     : "QmP7dh8np2CucK7g2s1B9rxZuKRzQDGwpDBUYzofKDuBdb"
    // }`;
    const imgLink = `${
      product === "Beige"
        ? "https://bafybeifuz6awfrygc3tswnsd32lrqf4mhznxdq5eroureugcavmscbcwha.ipfs.dweb.link/Natural.mp4"
        : product === "Blue"
        ? "https://bafybeihicoc3yr2n53xrmrebdcn7w6qbnw7ostra5cejf3k5s6e2t44nm4.ipfs.dweb.link/Blue.mp4"
        : product === "Brown"
        ? "https://bafybeigwkfxym4kxji3dpuvn3ibuh7af4byeczsu25stsoniglqafuhi4e.ipfs.dweb.link/Brown%20Choco.mp4"
        : product === "Green"
        ? "https://bafybeifd7bborvabtd7qw54pbzwoscyjhvgmhzykb6jlleew436gylrihu.ipfs.dweb.link/Green.mp4"
        : "https://bafybeigmnfclgowmdwgdmfmy7vt5noh5dm43lsioxgt6q5mjrmwynn3as4.ipfs.dweb.link/Olive.mp4"
    }`;
    let nftNumber =
      totalSupply > 100
        ? `${parseInt(totalSupply) + 1}`
        : totalSupply < 100 && totalSupply >= 10
        ? `0${parseInt(totalSupply) + 1}`
        : `00${parseInt(totalSupply) + 1}`;

    const nftMetadata = {
      name: `${product} ${nftNumber}`,
      imgUrl: imgLink,
      originalMinter: minter,
      size: size,
      color: product,
    };
    console.log(nftMetadata);
    // const CID = await pinata.pinJSONToIPFS(nftMetadata, {
    //   pinataMetadata: `${product} ${nftNumber}`,
    // });
    const ext = "json";
    const fileName = nftMetadata.name;
    const file = JSON.stringify(nftMetadata);
    const newFile = new File([file], fileName, { type: file.type });
    const cid = await web3storageclient.put([newFile], {
      name: fileName,
    });
    const imageURI = `https://${cid}.ipfs.dweb.link/${
      fileName.split(" ").length >= 2
        ? fileName.split(" ").join("%20")
        : fileName
    }`;
    // var config = {
    //   method: "post",
    //   url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    //   headers: {
    //     "Content-Type": "application/json",
    //     pinata_api_key: PINATA_KEY,
    //     pinata_secret_api_key: PINATA_SECRET,
    //   },
    //   data: JSON.stringify(nftMetadata),
    // };

    // const res = await axios(config);

    // console.log(res.data);
    // const CID = res.data.IpfsHash;

    console.log(imageURI);
    let hash = await contract.mint(minter, imageURI, { gasLimit: 5000000 });
    // .send({
    //   from: myAccount.address,
    //   gas: 8_000_000,
    //   gasPrice: "1000000000",
    // })
    // .on("receipt", function (receipt) {
    //   console.log("receipt: ", receipt.contractAddress);
    //   return receipt.contractAddress; // contains the new contract address
    // });
    console.log(hash);
  } catch (error) {
    console.log(error);
  }
};
// mintWallet("Beige", "0x802d7BE7BB8C8172C862Dd6701c38dc4056b850d", "L");
