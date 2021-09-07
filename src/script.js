let monetizer;
let signer;
let account;
let localStorage;

// Address of the YouTube monetizer contract
const ADDRESS = "0xF4C859C0D368167eA820FFF9444662Dee9DF3186";

// Load artifacts
const init = async () => {
  localStorage = window.localStorage;

  initSpinner();

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
  }
};

const initSpinner = () => {
  let options = "";
  const videos = JSON.parse(localStorage.getItem("videos"));
  const length = videos !== null ? videos.length : 0;

  if (length === 0) {
    document.getElementById("spinner").style.display = "none";
    document.getElementById("new").style.display = "none";
  } else {
    document.getElementById("spinner").style.display = "inline";
    document.getElementById("new").style.display = "inline";

    // prettier-ignore
    for (let i = 0; i < length; ++i) {
    options += 
    `<option value="${videos[i].videoId}">${videos[i].title}</option>`;
  }

    document.getElementById("spinner").innerHTML = options;
  }
};

const loadFromSpinner = async () => {
  const select = document.getElementById("spinner");
  const videoId = select.options[select.selectedIndex].value;

  const video = getVideo(videoId);

  if (video.lockTime !== undefined) {
    setValue(
      "youtube-url",
      `https://www.youtube.com/watch?v=${video.videoId}`
    );
    setValue("lock-time", video.lockTime);
    setValue("view-count", video.viewCount);
    setValue("money-amount", video.moneyAmount);
    setValue("beneficiary-address", video.beneficiaryAddress);
    updateStatus();
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
    const video = {
      title: (await getVideoStats(parseUrl(parseInput("youtube-url")))).title,
      videoId: parseUrl(parseInput("youtube-url")),
      lockTime: Number(parseInput("lock-time")),
      viewCount: Number(parseInput("view-count")),
      moneyAmount: parseInput("money-amount"),
      beneficiaryAddress: parseInput("beneficiary-address"),
      timeLeft: 0
    };

    await monetizer.deposit(
      video.videoId,
      video.beneficiaryAddress,
      video.lockTime,
      video.viewCount,
      {
        gasLimit: 3000000,
        value: ethers.utils.parseEther(video.moneyAmount)
      }
    );

    let t = new Date();
    t.setSeconds(t.getSeconds() + video.lockTime + 60);
    video.timeLeft = t.getTime();

    let _videos = JSON.parse(localStorage.getItem("videos"));
    videos = _videos !== null ? _videos : [];
    videos.push(video);

    localStorage.setItem("videos", JSON.stringify(videos));

    initSpinner();

    updateStatus();
  } catch (e) {
    console.log(e);
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
    const videoId = parseUrl(parseInput("youtube-url"));

    await monetizer.withdraw(videoId, { gasLimit: 3000000 });

    let _videos = JSON.parse(localStorage.getItem("videos"));
    videos = _videos !== null ? _videos : [];

    let newVideos = [];

    for (let i = 0; i < videos.length; ++i) {
      if (videos[i].videoId !== videoId) {
        newVideos.push(videos[i]);
      }
    }

    localStorage.setItem("videos", JSON.stringify(newVideos));

    initSpinner();
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
  document.getElementById("views").innerText = "";
  document.getElementById("time-left").innerText = "";

  localStorage.removeItem("current");
};

const getVideo = (videoId) => {
  return JSON.parse(localStorage.getItem("videos")).filter(
    (vid) => vid.videoId === videoId
  )[0];
};

const getVideoStats = async (videoId) => {
  return (
    await axios.get(
      `https://api-middlewares.vercel.app/api/youtube/${videoId}`
    )
  ).data;
};

const updateStatus = async () => {
  const videoId = parseUrl(parseInput("youtube-url"));
  const views = (await getVideoStats(videoId)).views;
  const timeLeft = getVideo(videoId).timeLeft - new Date().getTime();

  document.getElementById("views").innerText = `Views: ${views}`;
  document.getElementById("time-left").innerText =
    timeLeft > 0
      ? `Time left: ${Math.trunc(timeLeft / 1000)} seconds`
      : 'You can hit "Check", then "Withdraw" after 7 minutes';
};
