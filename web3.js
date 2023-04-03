import Web3 from "web3";
import fs from "fs";
const abiFile = JSON.parse(fs.readFileSync("./abi/familynft.json"));
const abi = abiFile.abi;

import dotenv from "dotenv";
import { File, Web3Storage } from "web3.storage";
import { ethers } from "ethers";
dotenv.config();
import { envCheck } from "./helpers/envCheck.js";
//LUSKO is a feature flag for lukso, toggle to false to use goerli
import {
  LUKSO_NETWORK_URL,
  GOERLI_NETWORK_URL,
  LUKSO_CONTRACT_ADDRESS,
  LUKSO,
  GOERLI_CONTRACT_ADDRESS,
} from "./constants/constants.js";

envCheck(["PRIVATE_KEY", "PRIVATE_KEY_LUKSO", "WEB3_STORAGE"]);

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PRIVATE_KEY_LUKSO = process.env.PRIVATE_KEY_LUKSO;
const WEB3STORAGE_API_KEY = process.env.WEB3_STORAGE;

const web3storageclient = new Web3Storage({
  token: WEB3STORAGE_API_KEY,
  endpoint: new URL("https://api.web3.storage"),
});

const web3 = new Web3(LUKSO ? LUKSO_NETWORK_URL : GOERLI_NETWORK_URL);

const provider = new ethers.providers.JsonRpcProvider(
  LUKSO ? LUKSO_NETWORK_URL : GOERLI_NETWORK_URL
);
const myAccount = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
const signer = new ethers.Wallet(
  LUKSO ? PRIVATE_KEY_LUKSO : PRIVATE_KEY,
  provider
);

web3.eth.accounts.wallet.add(myAccount.privateKey);

// this function is used to mint the NFTs to the user's wallet address on the blockchain network (Lukso or Goerli)
export const mintWallet = async (product, minter, size) => {
  //TODO: swap IPFS for arweave
  try {
    let contract = new ethers.Contract(
      LUKSO ? LUKSO_CONTRACT_ADDRESS : GOERLI_CONTRACT_ADDRESS,
      abi,
      signer
    );

    const totalSupply = await contract.totalSupply();
    console.log("total supply", parseInt(totalSupply));
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
      totalSupply > 99
        ? `${parseInt(totalSupply) + 1}`
        : totalSupply < 100 && totalSupply >= 9
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

    console.log(imageURI);
    let hash = await contract.mint(minter, imageURI, { gasLimit: 5000000 });
    console.log(hash);
  } catch (error) {
    console.log(error);
  }
};
