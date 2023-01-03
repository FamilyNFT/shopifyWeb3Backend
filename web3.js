import Web3 from "web3";
import abi from "./abi/familynft.json" assert { type: "json" };
import PinataClient from "@pinata/sdk";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const PINATA_SECRET = process.env.PINATA_SECRET;
const PINATA_KEY = process.env.PINATA_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const pinata = new PinataClient(PINATA_KEY, PINATA_SECRET);
// const web3 = new Web3("https://rpc.l16.lukso.network/");
const web3 = new Web3("https://rpc.ankr.com/eth_goerli");
// const myAccount = web3.eth.accounts.privateKeyToAccount(
//   "0xc2bd836122e9886b39d77d2865e434daeb08fd6e9a040a124b6174676d2a2231"
// );
const myAccount = web3.eth.accounts.privateKeyToAccount(
  PRIVATE_KEY
);

web3.eth.accounts.wallet.add(myAccount.privateKey);

export const mintWallet = async (product, minter, size) => {
  try {
    // const contract = new web3.eth.Contract(
    //   abi.abi,
    //   "0xCD8316EDF82Bb3De7142b73C9Ece6a8171ce4C11",
    //   { gas: 5_000_000, gasPrice: "1000000000" }
    // );
    const contract = new web3.eth.Contract(
      abi.abi,
      "0x450a0461D584449386e008afa848d76217dC9e91",
      { gas: 5_000_000, gasPrice: "1000000000" }
    );
    const totalSupply = await contract.methods.totalSupply().call();
    console.log("total supply", totalSupply);
    let imgCIDs = {
      Biege: "QmUuNWg4W1xHujztXnmewZiotE4nkPUxwi6CueByo87LaE",
      Blue: "QmZEJboL7hKaq1CF1oC8QkZcyCXcx2LXR4v4rNf5GbQDb1",
      Brown: "QmTFMhv6f4LMnAxju2fva8ps7b7vDbs7RstSGfRAyBfkaB",
      Green: "QmZSzzXhgwcpm7V37nKKd9pFq6zz77wMG6Rjf6wPrjFAiT",
      Olive: "QmP7dh8np2CucK7g2s1B9rxZuKRzQDGwpDBUYzofKDuBdb",
    };
    const imgLink = `https://gateway.pinata.cloud/ipfs/${
      product === "Beige"
        ? "QmUuNWg4W1xHujztXnmewZiotE4nkPUxwi6CueByo87LaE"
        : product === "Blue"
        ? "QmZEJboL7hKaq1CF1oC8QkZcyCXcx2LXR4v4rNf5GbQDb1"
        : product === "Brown"
        ? "QmTFMhv6f4LMnAxju2fva8ps7b7vDbs7RstSGfRAyBfkaB"
        : product === "Green"
        ? "QmZSzzXhgwcpm7V37nKKd9pFq6zz77wMG6Rjf6wPrjFAiT"
        : "QmP7dh8np2CucK7g2s1B9rxZuKRzQDGwpDBUYzofKDuBdb"
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
    var config = {
      method: "post",
      url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: PINATA_KEY,
        pinata_secret_api_key: PINATA_SECRET,
      },
      data: JSON.stringify(nftMetadata),
    };

    const res = await axios(config);

    console.log(res.data);
    const CID = res.data.IpfsHash;

    console.log(CID);
    let hash = await contract.methods
      .mint(minter, `https://gateway.pinata.cloud/ipfs/${CID}`)
      .send({
        from: myAccount.address,
        gas: 6_000_000,
        gasPrice: "1000000000",
      })
      .on("receipt", function (receipt) {
        console.log("receipt: ", receipt.contractAddress);
        return receipt.contractAddress; // contains the new contract address
      });
    console.log(hash);
  } catch (error) {
    console.log(error);
  }
};
// mintWallet("Beige", myAccount.address, "L");
