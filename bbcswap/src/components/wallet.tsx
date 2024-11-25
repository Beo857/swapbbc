async function handleAddLiqidity(e) {
  try {
    e.preventDefault();
    if (parseEther(amountA).lt(1) || parseEther(amountB).lt(1)) {
      throw new Error("Amounts must be at least 1 wei.");
    }

    provider?.getFeeData().then((res) => {
      setGasPrice(res.gasPrice._hex);
    });

    const amountAMin = parseEther(amountA).sub(parseEther(amountA).div(parseEther("0.0000000000000001")));
    const amountBMin = parseEther(amountB).sub(parseEther(amountB).div(parseEther("0.0000000000000001")));
    const BBCcontract = await getContract(tokenABI, BBC);
    await BBCcontract.approve(routerAddress, parseEther(amountB), { gasPrice: gasPrice });

    const cont = await getContract(routerABI, routerAddress);
    const res = await cont.addLiquidityETH(
      BBC,
      parseEther(amountB),
      amountBMin,
      amountAMin,
      accounts[0],
      parseInt(Date.now() / 1000),
      { gasPrice: gasPrice, value: parseEther(amountA) }
    );
    console.log(res);
  } catch (e) {
    console.error(e.message || e);
  }
}

async function handleSwap(e) {
  try {
    e.preventDefault();
    if (parseEther(swapAmountA).lt(1)) {
      throw new Error("Swap amount must be at least 1 wei.");
    }

    provider?.getFeeData().then((res) => {
      setGasPrice(res.gasPrice._hex);
    });

    const cont = await getContract(routerABI, routerAddress);
    if (tokenSwap == "BBC") {
      let path = [WMATIC, BBC];
      const res = await cont.swapExactETHForTokens(
        parseEther(swapAmountB),
        path,
        accounts[0],
        parseInt(Date.now() / 1000),
        { gasPrice: gasPrice, value: parseEther(swapAmountA) }
      );
      console.log(res);
    } else {
      const BBCcontract = await getContract(tokenABI, BBC);
      await BBCcontract.approve(routerAddress, parseEther(swapAmountA));

      let path = [BBC, WMATIC];
      const res = await cont.swapExactTokensForETH(
        parseEther(swapAmountA),
        parseEther(swapAmountB),
        path,
        accounts[0],
        parseInt(Date.now() / 1000),
        { gasPrice: gasPrice }
      );
      console.log(res);
    }
  } catch (e) {
    console.error(e.message || e);
  }
}

async function handleStake(e) {
  try {
    e.preventDefault();
    if (parseEther(stakeAmount).lt(1)) {
      throw new Error("Stake amount must be at least 1 wei.");
    }

    provider?.getFeeData().then((res) => {
      setGasPrice(res.gasPrice._hex);
    });

    const Poolcont = await getContract(poolABI, WmaticWethPoolAddress);
    await Poolcont.approve(minichefV2, parseEther(stakeAmount));

    const cont = await getContract(minichefABI, minichefV2);
    const res = await cont.deposit(poolIndex, parseEther(stakeAmount), accounts[0], { gasPrice: gasPrice });
    console.log(res);
  } catch (e) {
    console.error(e.message || e);
  }
}

async function handleUnStake(e) {
  try {
    e.preventDefault();
    if (parseEther(unStakeAmount).lt(1)) {
      throw new Error("Unstake amount must be at least 1 wei.");
    }

    provider?.getFeeData().then((res) => {
      setGasPrice(res.gasPrice._hex);
    });

    const cont = await getContract(minichefABI, minichefV2);
    const res = await cont.withdraw(poolIndex, parseEther(unStakeAmount), accounts[0], { gasPrice: gasPrice });
    console.log(res);
  } catch (e) {
    console.error(e.message || e);
  }
}

async function handleSwapAmounts(e) {
  if (e.target.value != "") {
    if (parseEther(e.target.value).lt(1)) {
      alert("Swap amount must be at least 1 wei.");
      return;
    }

    const reserves = await getReserve();
    if (tokenSwap == "MATIC") {
      const quotes = await getAmountOut(parseEther(e.target.value), reserves._reserve1, reserves._reserve0);
      setSwapAmountB(formatEther(quotes._hex));
    } else {
      const quotes = await getAmountOut(parseEther(e.target.value), reserves._reserve0, reserves._reserve1);
      setSwapAmountB(formatEther(quotes._hex));
    }
  }
}

async function handleAmounts(e) {
  if (e.target.value != "") {
    if (parseEther(e.target.value).lt(1)) {
      alert("Amounts must be at least 1 wei.");
      return;
    }

    const reserves = await getReserve();
    setTimeout(async () => {
      if (e.target.name == "bbc-amount") {
        const quotes = await getQuote(parseEther(e.target.value), reserves._reserve1, reserves._reserve0);
        setAmountA(formatEther(quotes));
      } else {
        const quotes = await getQuote(parseEther(e.target.value), reserves._reserve0, reserves._reserve1);
        setAmountB(formatEther(quotes));
      }
    }, 1500);
  }
}
