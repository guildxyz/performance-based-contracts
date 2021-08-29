let viewCountAbi;
let monetizer;
let signer;
let account;
let localStorage;

// Address of the YouTube monetizer contract
const ADDRESS = "0x983301a4B7D40409d0A7A5c2a73D349CB502A7C3";

// Load artifacts
const init = async () => {
  localStorage = window.localStorage;

  const _video = localStorage.getItem("current");
  const video = _video !== null ? JSON.parse(_video) : {};

  if (video.lockTime !== undefined) {
    setValue(
      "youtube-url",
      `https://www.youtube.com/watch?v=${video.videoId}`
    );
    setValue("lock-time", video.lockTime);
    setValue("view-count", video.viewCount);
    setValue("money-amount", video.moneyAmount);
    setValue("beneficiary-address", video.beneficiaryAddress);
  }

  if (typeof window.ethereum === "undefined") {
    alert("MetaMask is not installed!");
    throw new Error("MetaMask is not installed!");
  } else {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();

    fetch("./Monetizer.json")
      .then((response) => {
        return response.json();
      })
      .then(
        (data) => (monetizer = new ethers.Contract(ADDRESS, data.abi, signer))
      );

    fetch("./ViewCountOracle.json")
      .then((response) => {
        return response.json();
      })
      .then((data) => (viewCountAbi = data.abi));
  }
};

/**
 * Helper function for getting the ID of a YouTube video from a URL
 * Source: https://stackoverflow.com/a/8260383/5596516
 */
const parseUrl = (url) => {
  let match = url.match(
    /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/
  );
  return match && match[7].length == 11 ? match[7] : false;
};

// Helper function for getting value of input fields
const parseInput = (id) => document.getElementById(id).value;

const setValue = (id, value) => (document.getElementById(id).value = value);

const deposit = async () => {
  try {
    let x = new XMLHttpRequest();
    x.open(
      "GET",
      "https://cors-anywhere.herokuapp.com/" +
        `https://api-middlewares.vercel.app/api/youtube/${parseUrl(
          parseInput("youtube-url")
        )}`
    );
    x.setRequestHeader("X-Requested-With", "XMLHttpRequest");
    x.onload = function () {
      console.log(JSON.parse(x.responseText).views);
    };
    x.send();

    // prettier-ignore
    const video = {
      videoId           : parseUrl(parseInput("youtube-url")),
      lockTime          :   Number(parseInput("lock-time")),
      viewCount         :   Number(parseInput("view-count")),
      moneyAmount       :          parseInput("money-amount"),
      beneficiaryAddress:          parseInput("beneficiary-address"),
    }

    localStorage.setItem("current", JSON.stringify(video));
    localStorage.setItem("current-timestamp", new Date().getTime());

    await monetizer.deposit(
      video.videoId,
      video.beneficiaryAddress,
      video.lockTime,
      video.viewCount,
      {
        value: ethers.utils.parseEther(video.moneyAmount)
      }
    );
  } catch (e) {
    alert(e);
  }
};

// Send an update request to the Witnet oracle
const check = async () => {
  const videoId = parseUrl(parseInput("youtube-url"));

  try {
    await monetizer.checkViews(videoId, {
      gasLimit: 3000000,
      value: ethers.utils.parseEther("0.00102496")
    });
  } catch (e) {
    alert(e);
  }
};

// Withdraw the deposited money
const withdraw = async () => {
  try {
    await monetizer.withdraw(parseUrl(parseInput("youtube-url")));
  } catch (e) {
    alert(e);
  }
};

const clearData = async () => {
  setValue("youtube-url", "");
  setValue("lock-time", "");
  setValue("view-count", "");
  setValue("money-amount", "");
  setValue("beneficiary-address", "");

  localStorage.removeItem("current");
};
