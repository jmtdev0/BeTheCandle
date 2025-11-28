"use client";

import React from "react";
import Link from "next/link";

export default function CommunityPotGuidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030712] via-[#0a1628] to-[#030712] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-[#2276cb]/30">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#2276cb]">Community Pot Guide</h1>
          <Link 
            href="/community-pot" 
            className="text-sm text-[#2276cb] hover:text-white transition-colors"
          >
            ← Back to Community Pot
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-6 py-12 space-y-16">
        
        {/* Introduction */}
        <section className="space-y-4">
          <h2 className="text-3xl font-bold text-white">Getting Started</h2>
          <p className="text-slate-300 leading-relaxed">
            This guide will walk you through everything you need to participate in the Community Pot. 
            You&apos;ll learn how to set up a wallet, configure the Polygon network, and handle USDC once you receive it.
          </p>
          <div className="bg-[#2276cb]/10 border border-[#2276cb]/30 rounded-xl p-4">
            <p className="text-sm text-[#2276cb]">
              <strong>Estimated time:</strong> 10-15 minutes for first-time setup
            </p>
          </div>
        </section>

        {/* Table of Contents */}
        <nav className="bg-black/40 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Table of Contents</h3>
          <ol className="space-y-2 text-[#2276cb]">
            <li><a href="#metamask" className="hover:text-white transition-colors">1. Creating a MetaMask Wallet</a></li>
            <li><a href="#polygon" className="hover:text-white transition-colors">2. Adding the Polygon Network</a></li>
            <li><a href="#usdc-token" className="hover:text-white transition-colors">3. Importing the USDC Token</a></li>
            <li><a href="#pol-gas" className="hover:text-white transition-colors">4. Getting POL for Gas Fees</a></li>
            <li><a href="#cash-out" className="hover:text-white transition-colors">5. Converting USDC to Your Bank</a></li>
          </ol>
        </nav>

        {/* Section 1: MetaMask */}
        <section id="metamask" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2276cb] text-white font-bold">1</span>
            <h2 className="text-2xl font-bold text-white">Creating a MetaMask Wallet</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            MetaMask is a popular cryptocurrency wallet that works as a browser extension. It&apos;s free, secure, and supports the Polygon network.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Steps:</h3>
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">1.</span>
                <span>Visit <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">metamask.io/download</a> and install the extension for your browser (Chrome, Firefox, Brave, or Edge).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">2.</span>
                <span>Click &quot;Create a new wallet&quot; and accept the terms of service.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">3.</span>
                <span>Create a strong password. This encrypts your wallet on your device.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">4.</span>
                <span><strong className="text-amber-300">Important:</strong> Write down your 12-word Secret Recovery Phrase on paper. Never share it with anyone. Store it safely offline.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">5.</span>
                <span>Confirm your recovery phrase by selecting the words in order.</span>
              </li>
            </ol>
          </div>

          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
            <p className="text-sm text-amber-200">
              <strong>⚠️ Security Warning:</strong> Your Secret Recovery Phrase is the master key to your wallet. 
              Anyone who has it can access your funds. Never enter it on any website, and never share it via email or chat.
            </p>
          </div>
        </section>

        {/* Section 2: Polygon Network */}
        <section id="polygon" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2276cb] text-white font-bold">2</span>
            <h2 className="text-2xl font-bold text-white">Adding the Polygon Network</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            Polygon is a fast and low-cost blockchain network. The Community Pot sends USDC on Polygon, so you need to add it to MetaMask.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Option A: Automatic (Recommended)</h3>
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">1.</span>
                <span>Visit <a href="https://chainlist.org/chain/137" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">chainlist.org/chain/137</a></span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">2.</span>
                <span>Click &quot;Connect Wallet&quot; and approve the connection in MetaMask.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">3.</span>
                <span>Click &quot;Add to MetaMask&quot; and approve the network addition.</span>
              </li>
            </ol>
          </div>

          <div className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-white">Option B: Manual Setup</h3>
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">1.</span>
                <span>Open MetaMask and click on the network dropdown (usually says &quot;Ethereum Mainnet&quot;).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">2.</span>
                <span>Click &quot;Add Network&quot; → &quot;Add a network manually&quot;.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">3.</span>
                <span>Enter these details:</span>
              </li>
            </ol>
            
            <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Network Name:</span>
                <span className="text-white">Polygon Mainnet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RPC URL:</span>
                <span className="text-white">https://polygon-rpc.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chain ID:</span>
                <span className="text-white">137</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency Symbol:</span>
                <span className="text-white">POL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Block Explorer:</span>
                <span className="text-white">https://polygonscan.com</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: USDC Token */}
        <section id="usdc-token" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2276cb] text-white font-bold">3</span>
            <h2 className="text-2xl font-bold text-white">Importing the USDC Token</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            USDC is a stablecoin pegged to the US Dollar. To see your USDC balance in MetaMask, you need to import the token contract.
          </p>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Steps:</h3>
            <ol className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">1.</span>
                <span>Make sure you&apos;re connected to the Polygon network in MetaMask.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">2.</span>
                <span>Click &quot;Import tokens&quot; at the bottom of your asset list.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">3.</span>
                <span>Paste the USDC contract address:</span>
              </li>
            </ol>
            
            <div className="bg-black/40 border border-white/10 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-2">USDC Contract Address (Polygon)</p>
              <code className="text-[#2276cb] font-mono text-sm break-all select-all">
                0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
              </code>
            </div>

            <ol start={4} className="space-y-3 text-slate-300">
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">4.</span>
                <span>MetaMask should auto-fill the token symbol (USDC) and decimals (6).</span>
              </li>
              <li className="flex gap-3">
                <span className="text-[#2276cb] font-mono">5.</span>
                <span>Click &quot;Next&quot; and then &quot;Import&quot;.</span>
              </li>
            </ol>
          </div>

          <div className="bg-[#2276cb]/10 border border-[#2276cb]/30 rounded-xl p-4">
            <p className="text-sm text-[#2276cb]">
              <strong>Tip:</strong> You can verify this is the official USDC contract on{" "}
              <a 
                href="https://polygonscan.com/token/0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" 
                target="_blank" 
                rel="noreferrer"
                className="underline hover:text-white"
              >
                PolygonScan
              </a>.
            </p>
          </div>
        </section>

        {/* Section 4: POL for Gas */}
        <section id="pol-gas" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2276cb] text-white font-bold">4</span>
            <h2 className="text-2xl font-bold text-white">Getting POL for Gas Fees</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            Every transaction on Polygon requires a small amount of POL (the native token) to pay for gas fees. 
            You&apos;ll need POL to transfer or swap your USDC later.
          </p>

          <div className="bg-emerald-500/10 border border-emerald-400/30 rounded-xl p-4 mb-6">
            <p className="text-sm text-emerald-200">
              <strong>💡 Good news:</strong> Gas fees on Polygon are extremely low—typically less than $0.01 per transaction. 
              Having $1-2 worth of POL will last you hundreds of transactions.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Ways to Get POL:</h3>
            
            <div className="space-y-4">
              <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                <h4 className="font-semibold text-white mb-2">Option 1: Buy on an Exchange</h4>
                <p className="text-slate-300 text-sm mb-3">
                  Purchase POL on exchanges like Coinbase, Binance, or Kraken, then withdraw directly to your Polygon address.
                </p>
                <p className="text-xs text-slate-400">
                  When withdrawing, make sure to select &quot;Polygon&quot; as the network, not &quot;Ethereum&quot;.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                <h4 className="font-semibold text-white mb-2">Option 2: Use a Fiat On-Ramp</h4>
                <p className="text-slate-300 text-sm mb-3">
                  Services like{" "}
                  <a href="https://www.moonpay.com/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">MoonPay</a>,{" "}
                  <a href="https://www.transak.com/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">Transak</a>, or{" "}
                  <a href="https://ramp.network/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">Ramp</a>{" "}
                  let you buy crypto directly with a credit card.
                </p>
              </div>

              <div className="bg-black/40 border border-white/10 rounded-xl p-5">
                <h4 className="font-semibold text-white mb-2">Option 3: Bridge from Another Network</h4>
                <p className="text-slate-300 text-sm mb-3">
                  If you have crypto on Ethereum or another chain, you can bridge it to Polygon using{" "}
                  <a href="https://portal.polygon.technology/bridge" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">Polygon Bridge</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 5: Cash Out */}
        <section id="cash-out" className="space-y-6 scroll-mt-24">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[#2276cb] text-white font-bold">5</span>
            <h2 className="text-2xl font-bold text-white">Converting USDC to Your Bank</h2>
          </div>
          
          <p className="text-slate-300 leading-relaxed">
            Once you receive USDC from the Community Pot, you have several options to convert it to fiat currency in your bank account.
          </p>

          <div className="space-y-6">
            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <h4 className="font-semibold text-white mb-3">Option 1: Centralized Exchange (Recommended)</h4>
              <p className="text-slate-300 text-sm mb-4">
                Send your USDC to an exchange that supports Polygon deposits, sell for fiat, and withdraw to your bank.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400"><strong>Popular exchanges:</strong> Coinbase, Kraken, Binance, Crypto.com</p>
                <p className="text-slate-400"><strong>Typical fees:</strong></p>
                <ul className="list-disc list-inside text-slate-400 ml-4 space-y-1">
                  <li>Network fee to send USDC: ~$0.001</li>
                  <li>Exchange trading fee: 0.1% - 0.5%</li>
                  <li>Bank withdrawal: $0 - $25 depending on method</li>
                </ul>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <h4 className="font-semibold text-white mb-3">Option 2: Direct Off-Ramp Services</h4>
              <p className="text-slate-300 text-sm mb-4">
                Some services let you sell crypto directly to your bank without a traditional exchange.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">
                  <strong>Services:</strong>{" "}
                  <a href="https://www.moonpay.com/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">MoonPay</a>,{" "}
                  <a href="https://www.transak.com/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">Transak</a>,{" "}
                  <a href="https://ramp.network/" target="_blank" rel="noreferrer" className="text-[#2276cb] hover:underline">Ramp</a>
                </p>
                <p className="text-slate-400"><strong>Typical fees:</strong> 1% - 3% total</p>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5">
              <h4 className="font-semibold text-white mb-3">Option 3: Hold as USDC</h4>
              <p className="text-slate-300 text-sm">
                USDC is pegged 1:1 to the US Dollar. You can keep it in your wallet as a stable store of value 
                and convert later when you need it, or use it directly for online purchases at merchants that accept crypto.
              </p>
            </div>
          </div>

          {/* Fee Summary */}
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-5">
            <h4 className="font-semibold text-amber-200 mb-3">📊 Estimated Total Fees (Exchange Route)</h4>
            <div className="space-y-2 text-sm text-amber-100">
              <p>For a $10 USDC payout:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Send to exchange: ~$0.001</li>
                <li>Trading fee (0.5%): ~$0.05</li>
                <li>Bank withdrawal (SEPA/ACH): $0-5</li>
              </ul>
              <p className="mt-3 font-semibold">
                Total: approximately $0.05 - $5.05 depending on your bank withdrawal method.
              </p>
              <p className="text-xs mt-2 text-amber-200/70">
                Tip: Accumulate multiple payouts before cashing out to minimize fixed withdrawal fees.
              </p>
            </div>
          </div>
        </section>

        {/* Final Notes */}
        <section className="space-y-6 border-t border-white/10 pt-12">
          <h2 className="text-2xl font-bold text-white">Need More Help?</h2>
          <p className="text-slate-300 leading-relaxed">
            If you run into any issues or have questions, feel free to reach out to the community. 
            We&apos;re here to help you get started!
          </p>
          <div className="flex gap-4">
            <Link 
              href="/community-pot" 
              className="px-6 py-3 bg-[#2276cb] text-white rounded-xl font-semibold hover:bg-[#1a5ba8] transition-colors"
            >
              Back to Community Pot
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-16">
        <div className="max-w-4xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
          <p>Community Pot Guide • Last updated November 2025</p>
        </div>
      </footer>
    </div>
  );
}
