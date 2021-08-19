let viewCountAbi;
let monetizer;
let signer;
let account;

const ADDRESS = "0xEA17b1Ca32080249e07709aB485A6ECEc796D21d";

// Load artifacts
const init = async () => {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask is not installed!");
    throw new Error("MetaMask is not installed!");
  } else {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    fetch("./Monetizer.json")
      .then(response => {
        return response.json();
      })
      .then(
        data => (monetizer = new ethers.Contract(ADDRESS, data.abi, signer))
      );

    fetch("./ViewCountOracle.json")
      .then(response => {
        return response.json();
      })
      .then(data => (viewCountAbi = data.abi));
  }
};

/**
 * Helper function for getting the ID of a YouTube video from a URL
 * Source: https://stackoverflow.com/a/8260383/5596516
 */
const parseUrl = url => {
  let match = url.match(
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  );
  return match && match[7].length == 11 ? match[7] : false;
};

// Helper function for getting value of input fields
const parseInput = id => document.getElementById(id).value;

const deposit = async () => {
  // prettier-ignore
  try {
    const videoId            = parseUrl(parseInput("youtube-url"));
    const lockTime           =   Number(parseInput("lock-time"));
    const viewCount          =   Number(parseInput("view-count"));
    const moneyAmount        =          parseInput("money-amount");
    const beneficiaryAddress =          parseInput("beneficiary-address");

    await monetizer.deposit(videoId, beneficiaryAddress, lockTime, viewCount, {
      gasLimit: 3000000,
      gasPrice: ethers.utils.parseUnits("10.0", "gwei"),
      value: ethers.utils.parseEther(moneyAmount)
    });
  } catch (e) {
    alert(e);
  }
};

const request = async () => {
  try {
    const contract = new ethers.Contract(
      monetizer.getOracleAddress(parseUrl(parseInput("youtube-url"))),
      viewCountAbi,
      signer
    );

    if (!(await contract.pending())) {
      await contract.requestUpdate({
        gasLimit: 3000000,
        gasPrice: ethers.utils.parseUnits("10.0", "gwei"),
        value: ethers.utils.parseEther("0.00102496")
      });
    }

    const lastViewCount = await contract.lastViewCount();
    const lastRequestId = await contract.lastRequestId();

    console.log(
      `Last viewcount was ${lastViewCount}, last request was ${lastRequestId}`
    );
  } catch (e) {
    alert(e);
  }
};

const withdraw = async () => {
  try {
    await monetizer.withdraw(parseUrl(parseInput("youtube-url")));
  } catch (e) {
    alert(e);
  }
};
