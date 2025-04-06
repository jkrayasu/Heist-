
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useConnect, useDisconnect, useContractWrite, usePrepareContractWrite } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import ABI from '../abi/AIHeistGame.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_GAME_CONTRACT;

export default function HeistGameUI() {
  const [commitHash, setCommitHash] = useState('');
  const [salt, setSalt] = useState('');
  const [answer, setAnswer] = useState('');
  const [stage, setStage] = useState(1);
  const [bribeUsed, setBribeUsed] = useState(false);
  const [forked, setForked] = useState(false);
  const [log, setLog] = useState([]);

  const { address, isConnected } = useAccount();
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();

  const { config: startSessionConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'startSession',
    args: [commitHash]
  });
  const { write: startSession } = useContractWrite(startSessionConfig);

  const { config: revealConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'revealAnswer',
    args: [answer, salt]
  });
  const { write: revealAnswer } = useContractWrite(revealConfig);

  const { config: bribeConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'bribeToAdvance'
  });
  const { write: bribeToAdvance } = useContractWrite(bribeConfig);

  const { config: forkedConfig } = usePrepareContractWrite({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'forkedStageAttempt',
    args: [commitHash]
  });
  const { write: resolveFork } = useContractWrite(forkedConfig);

  function generateCommit(answer, salt) {
    return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["string", "bytes32"], [answer, salt]));
  }

  function handleCommit() {
    const hash = generateCommit(answer, salt);
    setCommitHash(hash);
    setLog(l => [...l, `Commit hash generated: ${hash}`]);
    startSession?.();
  }

  function handleReveal() {
    setLog(l => [...l, `Revealing answer: ${answer} with salt: ${salt}`]);
    revealAnswer?.();
  }

  function handleBribe() {
    setBribeUsed(true);
    setStage(stage + 1);
    setLog(l => [...l, `Bribe used. Skipping to stage ${stage + 1}`]);
    bribeToAdvance?.();
  }

  function handleForkCommit() {
    const hash = generateCommit(answer, salt);
    setCommitHash(hash);
    setForked(false);
    setLog(l => [...l, `Fork path resolved. Returning to stage ${stage}`]);
    resolveFork?.();
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🧠 Prompt-Powered Heist</h1>

      {!isConnected ? (
        <button className="bg-blue-700 text-white px-4 py-2 rounded" onClick={() => connect()}>Connect Wallet</button>
      ) : (
        <div className="mb-4">
          <p className="text-sm">Connected as {address}</p>
          <button className="bg-gray-700 text-white px-3 py-1 rounded" onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}

      <div className="mb-2">
        <label>Answer:</label>
        <input className="border px-2 py-1 w-full" value={answer} onChange={e => setAnswer(e.target.value)} />
      </div>
      <div className="mb-2">
        <label>Salt (random string):</label>
        <input className="border px-2 py-1 w-full" value={salt} onChange={e => setSalt(e.target.value)} />
      </div>

      <div className="space-x-2 mt-4">
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleCommit}>Start Session</button>
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleReveal}>Reveal</button>
        {!bribeUsed && <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={handleBribe}>Use Bribe</button>}
        {forked && <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleForkCommit}>Resolve Fork</button>}
      </div>

      <div className="mt-6 bg-gray-100 p-4 rounded">
        <h2 className="font-bold">Logs:</h2>
        <ul className="text-sm">
          {log.map((entry, i) => <li key={i}>{entry}</li>)}
        </ul>
      </div>
    </div>
  );
}
