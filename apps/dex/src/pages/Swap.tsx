import { useEffect, useMemo, useState } from 'react';
import { useTheme, x } from '@xstyled/styled-components';
import { getCurrencies, getCurrencyByAddress, getPairedCurrencies } from '../utils';
import { useGetAmountsIn, useGetAmountsOut } from '../hooks/useGetAmountsOut';
import { formatUnits, parseUnits } from 'viem';
import { useApprove } from '../hooks/useApprove';
import { useSwap } from '../hooks/useSwap';
import repeatIcon from '../img/fa-repeat.svg';
import { BaseButton } from '../components/BaseButton';
import { useAllowance } from '../hooks/useAllowance';
import { useSnackbar } from 'notistack';
import { useBalance } from '../hooks/useBalance';
import { useDexAddresses } from '../hooks/useDexAddresses';
import { useAccount, useBalance as useBalanceWagmi, useChainId } from 'wagmi';
import { Currency, EthereumAddress } from '@lira-dao/web3-utils';
import { SelectCurrencyModal } from '../components/modal/SelectCurrencyModal';
import { usePair } from '../hooks/usePair';
import BigNumber from 'bignumber.js';
import { useParams } from 'react-router-dom';
import { useDexPairs } from '../hooks/useDexPairs';
import { CurrencyInput } from '../components/swap/CurrencyInput';
import { useFetchPrices } from '../hooks/usePrices';
import { SwapHeader } from '../components/swap/SwapHeader';
import { PrimaryButtonWithLoader } from '../components/PrimaryButtonWithLoader';


export function Swap() {
  const params = useParams<{ pool: EthereumAddress }>();
  const pairs = useDexPairs();
  const pool = params.pool ? pairs[params.pool] : undefined;
  const currency0 = pool ? getCurrencyByAddress(pool.tokens[1]) : undefined;
  const currency1 = pool ? getCurrencyByAddress(pool.tokens[0]) : undefined;

  const th = useTheme();
  const chainId = useChainId();
  const dexAddresses = useDexAddresses();
  const { enqueueSnackbar } = useSnackbar();
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<number | null>(null);
  const [selectingCurrencies, setSelectingCurrencies] = useState<Currency[]>([]);

  const [currencyA, setCurrencyA] = useState<Currency>(currency0 ? currency0 : getCurrencies(chainId)[5]);
  const [currencyB, setCurrencyB] = useState<Currency | undefined>(currency1 ? currency1 : getCurrencies(chainId)[0]);

  const [firstValue, setFirstValue] = useState<string>('');
  const [secondValue, setSecondValue] = useState<string>('');

  const allowance1 = useAllowance(currencyA.address, dexAddresses.router);

  const [isSwapDisabled, setIsSwapDisabled] = useState<boolean>(true);

  const balanceA = useBalance(currencyA.address);
  const balanceB = useBalance(currencyB?.address);

  const [amountOut, setAmountOut] = useState<bigint>(0n);
  const [amountIn, setAmountIn] = useState<bigint>(0n);

  const amountsOut = useGetAmountsOut([currencyA.address, currencyB?.address || '0x0'], amountOut);
  const amountsIn = useGetAmountsIn([currencyA.address, currencyB?.address || '0x0'], amountIn);

  const approve = useApprove(currencyA.address, dexAddresses.router, parseUnits(firstValue.toString(), currencyA.decimals));

  const pair = usePair(currencyA, currencyB);
  const swap = useSwap([currencyA.address, currencyB?.address || '0x0'], parseUnits(firstValue.toString(), currencyA.decimals), currencyA.isNative, currencyB?.isNative);

  const isAllowCurrencyADisabled = useMemo(() => approve.isPending || allowance1.isPending, [approve, allowance1]);

  const account = useAccount();
  const accountBalance = useBalanceWagmi({ address: account.address });

  const insufficientBalanceA = useMemo(() => {
    if (currencyA.isNative) {
      return new BigNumber(parseUnits(firstValue, currencyA.decimals).toString()).gt(new BigNumber(accountBalance.data?.value.toString() || '0'));
    } else {
      return new BigNumber(parseUnits(firstValue, currencyA.decimals).toString()).gt(new BigNumber(balanceA.data?.toString() || '0'));
    }
  }, [accountBalance.data?.value, balanceA.data, currencyA.decimals, currencyA.isNative, firstValue]);

  const needAllowance = useMemo(() =>
      parseUnits(firstValue.toString(), currencyA.decimals) > 0 &&
      !currencyA.isNative &&
      allowance1.data !== undefined &&
      allowance1.data < parseUnits(firstValue.toString(), currencyA.decimals),
    [allowance1.data, currencyA.decimals, currencyA.isNative, firstValue]);

  const { data: pricesData, error, isLoading } = useFetchPrices();

  const ethPriceUSD = useMemo(() => {
    const ethData = pricesData?.find(price => price.symbol === 'ETH');
    return ethData ? parseFloat(ethData.price) : null;
  }, [pricesData]);

  const btcPriceUSD = useMemo(() => {
    const btcData = pricesData?.find(price => price.symbol === 'BTC');
    return btcData ? parseFloat(btcData.price) : null;
  }, [pricesData]);

  const [ldtPrice, setLdtPrice] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (amountsOut.data) {
      setSecondValue(formatUnits(amountsOut.data[1], currencyB?.decimals || 18));
    }
  }, [amountsOut]);

  useEffect(() => {
    if (amountsIn?.data?.[0]) {
      setFirstValue(formatUnits(amountsIn.data[0], currencyA.decimals));
    }
  }, [amountsIn]);

  const isEthLdtPair = (currencyA.symbol.includes('ETH') || currencyB?.symbol.includes('ETH')) && (currencyA.symbol.includes('LDT') || currencyB?.symbol.includes('LDT'));
  const isBtcLdtPair = (currencyA.symbol.includes('BTC') || currencyB?.symbol.includes('BTC')) && (currencyA.symbol.includes('LDT') || currencyB?.symbol.includes('LDT'));

  useEffect(() => {
    if (isEthLdtPair || isBtcLdtPair) {
      const priceCurrencyA = pair.priceCurrencyA.toFixed();
      const priceCurrencyB = pair.priceCurrencyB.toFixed();

      if (parseFloat(priceCurrencyA) > 0, parseFloat(priceCurrencyB) > 0) {
        const priceCurrency = (currencyA.symbol === 'LDT') ? priceCurrencyA : (currencyB?.symbol === 'LDT') ? priceCurrencyB : undefined;
        if (priceCurrency) {
          setLdtPrice(parseFloat(priceCurrency));
        }
      }
    }
  }, [pair]);

  useEffect(() => {
    if (swap.isPending) {
      setIsSwapDisabled(true);
    } else {
      setIsSwapDisabled(false);
    }
  }, [swap.isPending]);

  useEffect(() => {
    if (approve.confirmed) {
      enqueueSnackbar('Approve confirmed!', {
        autoHideDuration: 3000,
        variant: 'success',
      });
      allowance1.refetch();
    }
  }, [approve.confirmed]);

  useEffect(() => {
    if (swap.confirmed) {
      enqueueSnackbar('Swap confirmed!', {
        autoHideDuration: 3000,
        variant: 'success',
      });
      swap.reset();
      balanceA.refetch();
      balanceB.refetch();
      accountBalance.refetch();
      allowance1.refetch();
      pair.refetchReserves();
      setAmountOut(0n);
      setAmountIn(0n);
      setFirstValue('');
      setSecondValue('');
    }
  }, [swap.confirmed]);

  const onCurrencyAChange = (value: string) => {
    setFirstValue(value);

    if (value === '') {
      setSecondValue('');
      setAmountIn(0n);
      setAmountOut(0n);
    } else {
      setAmountIn(0n);
      setAmountOut(parseUnits(value, currencyA.decimals));
    }
  };

  const onCurrencyBChange = (value: string) => {
    setSecondValue(value);
    setAmountOut(0n);

    if (value === '') {
      setFirstValue('');
      setAmountOut(0n);
      setAmountIn(0n);
    } else {
      setAmountIn(parseUnits(value, currencyB?.decimals || 18));
      setAmountOut(0n);
    }
  };

  const switchCurrencies = () => {
    if (currencyA && currencyB) {
      const newCurrencyA = currencyB;
      const newCurrencyB = currencyA;

      setAmountOut(0n);
      setAmountIn(0n);

      setCurrencyA(newCurrencyA);
      setCurrencyB(newCurrencyB);

      setFirstValue('');
      setSecondValue('');
    }
  };

  const onCurrencySelectAClick = () => {
    setSelecting(0);
    setSelectingCurrencies(getCurrencies(chainId));
    setOpen(true);
  };

  const onCurrencySelectBClick = () => {
    setSelecting(1);
    setSelectingCurrencies(getPairedCurrencies(chainId, currencyA.paired));
    setOpen(true);
  };

  const onSelectCurrency = (c: any) => {
    if (selecting === 0) {
      setCurrencyA(c);
      setCurrencyB(undefined);
      setFirstValue('');
      setSecondValue('');
      setAmountOut(0n);
      setAmountIn(0n);
    } else {
      setCurrencyB(c);
      setSecondValue('');
      setAmountIn(0n);
    }

    setOpen(false);
  };

  const normalizeCurrencySymbol = (symbol: string) => {
    if (symbol.startsWith('W') && (symbol.includes('ETH') || symbol.includes('BTC'))) {
      return symbol.substring(1);
    }
    return symbol;
  };

  const computePrice = (currency: Currency) => {

    const externalPrice = (currencyA.symbol === 'WBTC' || currencyB?.symbol === 'WBTC') ? btcPriceUSD : ethPriceUSD;
    if (!externalPrice) {
      return '';
    }

    const directPrice = pricesData?.find(price => price.symbol === normalizeCurrencySymbol(currency.symbol));
    if (directPrice) {
      return `${externalPrice}`;
    }

    const priceCurrencyA = pair.priceCurrencyA.toFixed();
    const priceCurrencyB = pair.priceCurrencyB.toFixed();

    if (currencyA && +priceCurrencyA > 0 && currencyB && +priceCurrencyB > 0) {

      if (currencyA.symbol.includes('TB') || currencyB.symbol.includes('TB')) {
        const currencyIsTb = currency.symbol.includes('TB');
        if (currencyIsTb) {
          const price = currencyA.symbol.includes('TB') ? priceCurrencyB : currencyB.symbol.includes('TB') ? priceCurrencyA : undefined;
          if (price && price !== '0') {
            if (ldtPrice !== undefined) {
              return `${(ldtPrice / parseFloat(price)) * externalPrice}`;
            }
          }
        }
      }

      if (currency.symbol === 'LIRA') {
        const price = (currencyA.symbol === 'LIRA') ? priceCurrencyB : (currencyB.symbol === 'LIRA') ? priceCurrencyA : undefined;
        if (price) {
          if (ldtPrice !== undefined) {
            return `${(ldtPrice / parseFloat(price)) * externalPrice}`;
          }
        }
      }

      if (currency.symbol === 'LDT') {
        const price = (currencyA.symbol === 'LDT') ? priceCurrencyA : (currencyB.symbol === 'LDT') ? priceCurrencyB : undefined;
        if (price) {

          if (parseFloat(price) === ldtPrice) {
            return `${parseFloat(price) * externalPrice}`;
          }

          if (ldtPrice === undefined) {
            return `${parseFloat(price) * externalPrice}`;
          }

          return `${ldtPrice * externalPrice}`;
        }
      }
    } else {
      if (!currency.isNative) {
        if (currency.symbol === 'LDT') {
          return (ldtPrice !== undefined) ? `${ldtPrice * externalPrice}` : '';
        }
      }
    }
  };

  return (
    <x.div w="100%" maxWidth="480px" borderRadius="16px" padding={4}>
      <SwapHeader title="Swap" showBack={!!params.pool} />

      <CurrencyInput
        balance={currencyA.isNative ? accountBalance.data?.value || 0n : balanceA.data ?? 0n}
        currency={currencyA}
        disabled={false}
        formattedBalance={new BigNumber(formatUnits(currencyA.isNative ? accountBalance.data?.value || 0n : balanceA.data ?? 0n, currencyA.decimals)).toFixed(6, 1)}
        id="currencyA"
        insufficientBalance={insufficientBalanceA}
        onChangeValue={(e) => onCurrencyAChange(e.target.value)}
        onCurrencySelectClick={onCurrencySelectAClick}
        onSetPercentage={onCurrencyAChange}
        selected={false}
        showPercentages
        title="You Pay"
        value={firstValue}
        price={computePrice(currencyA)}
      />

      <x.div mb="-46px">
        <BaseButton
          backgroundColor={{ _: 'green-yellow-950', hover: 'green-yellow-900' }}
          border="6px solid black"
          p={2}
          position="relative"
          w="fit-content"
          margin="-36px auto"
          zIndex={1}
          onClick={switchCurrencies}
        >
          <img src={repeatIcon} alt="switch currencies icon" width={20} />
        </BaseButton>
      </x.div>

      <CurrencyInput
        balance={currencyB?.isNative ? accountBalance.data?.value || 0n : balanceB.data ?? 0n}
        currency={currencyB}
        disabled={false}
        formattedBalance={new BigNumber(formatUnits(currencyB?.isNative ? accountBalance.data?.value || 0n : balanceB.data ?? 0n, currencyB?.decimals || 18)).toFixed(6, 1)}
        id="currencyB"
        insufficientBalance={false}
        onChangeValue={(e) => onCurrencyBChange(e.target.value)}
        onCurrencySelectClick={onCurrencySelectBClick}
        onSetPercentage={onCurrencyBChange}
        selected={false}
        title="You Receive"
        value={secondValue}
        price={currencyB && computePrice(currencyB)}
      />

      {(currencyA && currencyB) && (
        <x.div mt={4}>
          <x.p>Prices</x.p>

          <x.div>
            <x.div>
              <x.p>1 {currencyA.symbol} = {pair.priceCurrencyA.toFixed(pair.priceCurrencyA.lt(1) ? 8 : 2, 1)} {currencyB.symbol}</x.p>
              <x.p>1 {currencyB.symbol} = {pair.priceCurrencyB.toFixed(pair.priceCurrencyB.lt(1) ? 8 : 2, 1)} {currencyA.symbol}</x.p>
            </x.div>
            <x.br></x.br>
          </x.div>
        </x.div>
      )}

      {(needAllowance && !insufficientBalanceA) && (
        <x.div display="flex" mt={4} mb={2} h="80px" alignItems="center" justifyContent="center">
          <PrimaryButtonWithLoader
            isLoading={isAllowCurrencyADisabled}
            isDisabled={isAllowCurrencyADisabled}
            text="Approve"
            onClick={() => approve.write()}
          />
        </x.div>
      )}

      {(!needAllowance && !insufficientBalanceA) && (
        <x.div display="flex" mt={4} h="80px" alignItems="center" justifyContent="center">
          <PrimaryButtonWithLoader
            isLoading={isSwapDisabled}
            isDisabled={!firstValue && !secondValue}
            text="Swap"
            onClick={() => swap.write()}
          />
        </x.div>
      )}

      <SelectCurrencyModal
        open={open}
        onClose={() => setOpen(false)}
        currencies={selectingCurrencies}
        onSelect={onSelectCurrency}
      />
    </x.div>
  );
}
