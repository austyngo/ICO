import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import {
  NFT_CONTRACT_ABI,
  NFT_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ABI,
  TOKEN_CONTRACT_ADDRESS,
} from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // Create a BigNumber "0"
  const zero = BigNumber.from(0);
  // keep track of user wallet connection
  const [walletConnected, setWalletConnected] = useState(false);
  // loading set to true when transaction is processing
  const [loading, setLoading] = useState(false);
  // tokensToBeClaimed keeps track of number of tokens to be claimed
  // based on the NFT's held by user that havent claimed tokens
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  // balanceOfCryptoDevTokens keeps track of tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  // amount of tokens user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);
  //tokens minted - total number of tokens that have been minted til now
  const [tokensMinted, setTokensMinted] = useState(zero);
  // reference to web3modal to connect to MM, persists as long as page is open
  const web3ModalRef = useRef();

  /**
   * getTokensToBeClaimed: checks balance of tokens than user can claim
   */
  const getTokensToBeClaimed = async () => {
    try {
      // get provider from web3modal
      const provider = await getProviderOrSigner(); //defined later
      // instance of NFT contract
      const nftContract = new Contract(
        NFT_CONTRACT_ADDRESS,
        NFT_CONTRACT_ABI,
        provider
      );
      // instance of token contract
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // get signer to extract address of current connected MM wallet
      const signer = await getProviderOrSigner(true);
      // get address of wallet connected
      const address = await signer.getAddress();
      // call balanceOf from NFT contract to get number of NFTs held by user
      const balance = await nftContract.balanceOf(address);
      // balance is big number, compare with 'zero'
      if (balance == zero) {
        setTokensToBeClaimed(zero);
      } else {
        // amount keeps track ot unclaimed tokens
        var amount = 0;
        // for all NFTs, check if tokens have already been claimed
        // only increase the amount if the tokens have not been claimed for a NFT (for a given tokenId)
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i); //function from NFT contract
          const claimed = await tokenContract.tokenIdsClaimed(tokenId); // mapping in token contract
          if (!claimed) {
            amount++;
          }
        }
        // tokensToBeClaimed has been initialized to a Big Number, thus we would convert amount to a big number and then set value
        // useState tracks 1 per NFT. frontend will show amount * 10
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    } 
  };
  /**
   * getBalanceOfCryptoDevTokens: checks balance of CryptoDevTokens held by an address
   */
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      // get provider
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // get signer to get address of connected wallet
      const signer = await getProviderOrSigner(true);
      // get address of connected wallet
      const address = await signer.getAddress();
      // call balanceOf from token contract
      const balance = await tokenContract.balanceOf(address);
      // balance is already a Big Number -  dont need to convert
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero); // if error set to zero
    }
  };
  /**
   * mintCryptoDevToken: mints `amount` number of tokens given address
   */
  const mintCryptoDevToken = async (amount) => {
    try {
      // get signer for write transaction
      const signer = await getProviderOrSigner(true);
      // token contract instance
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // each token 0.001 ether - value need to send is 0.001 * `amount`
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        // parsing `value` as string to ether using the utils library from ethers.js
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for transaction
      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted(); //defined later
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  /** 
   * claimCryptoDevTokens: helps user claim tokens 
  */
  const claimCryptoDevTokens = async () => {
    try {
      // signer for write transaction
      const signer = await getProviderOrSigner(true);
      // token contract instance
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        signer
      );
      // call claim function from contract
      const tx = await tokenContract.claim();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully claimed Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err)
    }
  };

  /**
   * getTotalTokeksMinted: retrives total tokens minted until now out of total supply
   */
  const getTotalTokeksMinted = async () => {
    try {
      // get provider for read transaction
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(
        TOKEN_CONTRACT_ADDRESS,
        TOKEN_CONTRACT_ABI,
        provider
      );
      // get tokens that have been minted by calling totalSupply from ERC20
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    } 
  };

  /**
   * getProviderOrSigner: returns provider or signer connection with wallet
   * @param (*) needSigner - True if you need signer, default false
   */
  const getProviderOrSigner = async (needSigner = false) => {
    //connect to metamask
    //since we store 'web3Modal' as a reference, need to access `current` value to get access to underlying object
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // if user is not connected to Rinkeby network, let them know and throw error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Change network to Rinkeby");
      throw new Error("Change network to Rinkeby");
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  };

  const connectWallet = async () => {
    try {
      // get provider
      // when used for first time, prompts user to connect wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // useEffects are used to react to changes in the website
  // array at trhe end of function call represents what state changes will trigger this effect
  // in this case, whenever value of `walletConnected` changes, this effect will be called
  useEffect(() => {
    // if wallet not connected, create new instance of web3Modal and connect wallet
    if (!walletConnected) {
      // assign web3modal class to the reference object bt setting its current value
      // the current value is persisted as long as page is open
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokeksMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
    }
  }, [walletConnected]);

  /*
  renderButton: returns a button based on state of dapp
  */
  const renderButton = () => {
    // if waiting for something, return loading button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // if tokens to be claimed are greater than 0, return a claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className = {styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // if no tokens to claim, show mint button
    return (
      <div style={{ display: "flex-col"}}>
        <div>
          <input type="number" placeholder="Amount of Tokens"
          // BigNumber. from converts the `e.target.value` to a BigNumber
          onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))} //setTokenAmount useState
          className = {styles.input}
          />
        </div>
        <button className = {styles.button} disabled={!(tokenAmount > 0)} onClick={() => mintCryptoDevToken(tokenAmount)}> 
          Mint Tokens
          </button> 
      </div>
    );
  };
  // if wallet connected, show tokens minted, else button to connect wallet
  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string - call balanceOfCryptoDevTokens useState*/}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string - call tokensMinted useState*/}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );
}