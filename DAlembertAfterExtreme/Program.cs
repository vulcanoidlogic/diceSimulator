using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

namespace GuessingGameSafeBetting
{
    class Program
    {
        static void Main(string[] args)
        {
            // === PARSE COMMAND-LINE ARGUMENTS ===
                int trialCount = 100000;      // default
                double initialBankroll = 30.0; // default

            if (args.Length >= 1 && int.TryParse(args[0], out int t))
                trialCount = Math.Max(1, t);

            if (args.Length >= 2 && double.TryParse(args[1], out double b))
                initialBankroll = Math.Max(0.01, b);

            // optional third arg: z-threshold for triggering D'Alembert (default 2.5)
            double zThresholdExtreme = 2.5;
            if (args.Length >= 3 && double.TryParse(args[2], out double zt))
                zThresholdExtreme = zt;

            Console.WriteLine($"Starting simulation: {trialCount} trials | Bankroll: {initialBankroll:C2} | zThreshold: {zThresholdExtreme}\n");
            RunSimulation(trialCount, initialBankroll, zThresholdExtreme);
        }

        static void RunSimulation(int trialCount, double initialBankroll, double zThresholdExtreme)
        {
            Random rand = new Random();
            var outcomes = new List<(double value, string label)>();
            var modes = new List<ModeReport>();
            var bets = new List<BetRecord>();

            // === SETTINGS ===
            // Use cumulative history (no sliding window). Require a minimum number of samples
            const int minSamples = 30;
            const int maxTrialsWithoutReversal = 100;
            const double profitTargetMultiplier = 10.0;
            const double drawdownStop = 0.5;

            double bankroll = initialBankroll;
            double peakBankroll = bankroll;
            double modeStartBankroll = bankroll;

            Mode currentMode = null;
            int? modeStartTrial = null;
            int ovInSyncCount = 0;
            int unInAntiSyncCount = 0;
            int maxContinuationInMode = 0;
            int continuationStreak = 0;

            // D'Alembert settings
            const double dalembertStartBet = 0.20;   // start at $0.20
            const double dalembertStep = 0.02;       // change by $0.02 per win/loss

            bool inDAlembert = false;
            double currentDAlembertBet = 0.0;
            string dalembertSide = null; // "OV" or "UN"
            // Sequence tracking for hybrid stop
            double sequencePnL = 0.0;
            const double sequenceProfitTarget = 0.25; // stop early if sequence nets >= $0.50
            const double sequenceMinStopBet = dalembertStep;   // stop if next bet <= $0.20

            // Diagnostics: track max |z| and how many times |z| >= zThresholdExtreme occurred
            double maxAbsZ = 0.0;
            int extremeCountThreshold = 0;
            var extremeTrialsThreshold = new List<int>();

            for (int trial = 1; trial <= trialCount; trial++)
            {
                // === PROFIT TARGET QUIT ===
                if (bankroll >= initialBankroll * profitTargetMultiplier)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[PROFIT TARGET] {bankroll:C2} → QUIT");
                    Console.ResetColor();
                    break;
                }

                // If we don't yet have enough past samples, seed outcomes without betting.
                if (outcomes.Count < minSamples)
                {
                    double seedNumber = rand.NextDouble() * 100.0;
                    string seedLabel = seedNumber <= 50.00 ? "UN" : "OV";
                    outcomes.Add((seedNumber, seedLabel));
                    continue;
                }

                // === RECALCULATE Z-SCORE using only past outcomes ===
                int ovCount = outcomes.Count(o => o.label == "OV");
                int n = outcomes.Count;
                int unCount = n - ovCount;
                double p = 0.5;
                double expected = n * p;
                double stdDev = Math.Sqrt(n * p * (1 - p));
                double currentZ = stdDev > 0.0 ? (ovCount - expected) / stdDev : 0.0;

                // update diagnostics (check against configured threshold)
                double absZ = Math.Abs(currentZ);
                if (absZ > maxAbsZ) maxAbsZ = absZ;
                if (absZ >= zThresholdExtreme)
                {
                    extremeCountThreshold++;
                    extremeTrialsThreshold.Add(trial);
                }

                // Trigger a D'Alembert sequence when z reaches an extreme (positive -> OV, negative -> UN)
                if (!inDAlembert && Math.Abs(currentZ) >= zThresholdExtreme)
                {
                    inDAlembert = true;
                    currentDAlembertBet = dalembertStartBet;
                    sequencePnL = 0.0;
                    // Bet the opposite side of the extreme z-score
                    dalembertSide = currentZ >= zThresholdExtreme ? "UN" : "OV";
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"[{trial,5}] >>> DALEMEBERT START: side={dalembertSide} | z={currentZ,5:F2} <<<");
                    Console.ResetColor();
                }

                // Prepare pending bet if we are in a D'Alembert sequence and next bet is > 0 and bankroll allows
                bool willBet = false;
                double pendingBetSize = 0.0;
                string pendingBetSide = null;

                if (inDAlembert && currentDAlembertBet > 0.0 && bankroll > 0.0)
                {
                    pendingBetSize = Math.Round(Math.Min(currentDAlembertBet, bankroll), 2);
                    if (pendingBetSize > 0.0)
                    {
                        willBet = true;
                        pendingBetSide = dalembertSide;
                    }
                    else
                    {
                        // No funds to bet — stop sequence
                        inDAlembert = false;
                    }
                }

                // === ROLL NEXT OUTCOME (we decide based on past, then see the next outcome) ===
                double number = rand.NextDouble() * 100.0;
                string label = number <= 50.00 ? "UN" : "OV";

                // Add this new outcome to cumulative history (no sliding window)
                outcomes.Add((number, label));

                // Resolve pending D'Alembert bet
                if (willBet && pendingBetSide != null)
                {
                    bool won = label == pendingBetSide;
                    double pnl = won ? pendingBetSize : -pendingBetSize;
                    bankroll += pnl;
                    peakBankroll = Math.Max(peakBankroll, bankroll);

                    // track sequence pnl
                    sequencePnL += pnl;

                    bets.Add(new BetRecord
                    {
                        Trial = trial,
                        Mode = "DALEM",
                        ZScore = currentZ,
                        BetSide = pendingBetSide,
                        BetSize = pendingBetSize,
                        Outcome = label,
                        Won = won,
                        PnL = pnl,
                        Bankroll = bankroll
                    });

                    Console.ForegroundColor = won ? ConsoleColor.Cyan : ConsoleColor.Magenta;
                    Console.WriteLine($"[BET {trial,5}] {pendingBetSide} @ {pendingBetSize,7:C} → {(won ? "WIN" : "LOSS")} | Bankroll: {bankroll,8:C}");
                    Console.ResetColor();

                    // Update D'Alembert bet for next round
                    if (won)
                        currentDAlembertBet = Math.Round(currentDAlembertBet - dalembertStep, 2);
                    else
                        currentDAlembertBet = Math.Round(currentDAlembertBet + dalembertStep, 2);

                    // Hybrid stop: stop if sequence profit target reached OR the next bet would be <= min stop bet
                    if (sequencePnL >= sequenceProfitTarget || currentDAlembertBet <= sequenceMinStopBet)
                    {
                        Console.ForegroundColor = ConsoleColor.Yellow;
                        if (sequencePnL >= sequenceProfitTarget)
                            Console.WriteLine($"[{trial,5}] <<< DALEMBERT END: sequencePnL ${sequencePnL:F2} >= ${sequenceProfitTarget:F2} (profit target) >>>");
                        else
                            Console.WriteLine($"[{trial,5}] <<< DALEMBERT END: next bet would be ${currentDAlembertBet:F2} <= ${sequenceMinStopBet:F2} (min bet) >>>");
                        Console.ResetColor();
                        inDAlembert = false;
                        currentDAlembertBet = 0.0;
                        dalembertSide = null;
                        sequencePnL = 0.0;
                    }
                }

                // Emergency drawdown stop
                if (bankroll < peakBankroll * drawdownStop)
                {
                    Console.ForegroundColor = ConsoleColor.DarkRed;
                    Console.WriteLine($"[EMERGENCY STOP] Bankroll: {bankroll:C2}");
                    Console.ResetColor();
                    break;
                }
            }

            // Final mode
            if (currentMode != null)
            {
                int trialsInMode = trialCount - modeStartTrial.Value;
                string reason = trialsInMode >= maxTrialsWithoutReversal ? "timeout" : "sim end";
                EndModeAndReset(trialCount, trialsInMode, reason, maxContinuationInMode, ref currentMode, ref modeStartTrial,
                                ref ovInSyncCount, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
            }

            PrintFinalReport(bankroll, initialBankroll, peakBankroll, bets, modes);
            ExportBetsToCsv(bets, "safe_bets.csv");
            Console.WriteLine("\nBet log: safe_bets.csv");

            // Diagnostic summary
            Console.WriteLine($"\nDiagnostic: max |z| observed = {maxAbsZ:F3}, occurrences |z|>={zThresholdExtreme} = {extremeCountThreshold}");
            if (extremeCountThreshold > 0)
            {
                var examples = string.Join(", ", extremeTrialsThreshold.Take(10));
                Console.WriteLine($"Example extreme trials (first 10): {examples}{(extremeTrialsThreshold.Count>10? " ..." : "")} ");
            }
        }

        static void EnterModeOutput(int trial, string type, double z)
        {
            Console.ForegroundColor = type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{trial,5}] >>> MODE START: {type} | z={z,5:F2} <<<");
            Console.ResetColor();
        }

        static void EndModeAndReset(int endTrial, int trials, string reason, int maxCont,
                                    ref Mode currentMode, ref int? modeStartTrial,
                                    ref int ovCount, ref int unCount, ref int maxContOut, ref int streak,
                                    List<ModeReport> modes)
        {
            modes.Add(new ModeReport
            {
                ModeType = currentMode.Type,
                StartTrial = currentMode.StartTrial,
                ZScore = currentMode.ZScore,
                EndTrial = endTrial,
                TrialsBeforeReversal = trials,
                EndReason = reason,
                MaxContinuation = maxCont
            });

            Console.ForegroundColor = currentMode.Type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{endTrial,5}] <<< MODE END: {currentMode.Type} | {reason} >>>");
            Console.ResetColor();

            currentMode = null;
            modeStartTrial = null;
            if (currentMode?.Type == "SYNC") ovCount = 0; else unCount = 0;
            maxContOut = 0;
            streak = 0;
        }

        static void PrintFinalReport(double final, double initial, double peak, List<BetRecord> bets, List<ModeReport> modes)
        {
            int wins = bets.Count(b => b.Won);
            double winRate = bets.Count > 0 ? wins * 100.0 / bets.Count : 0;
            double roi = (final - initial) / initial * 100;
            double maxDD = peak > 0 ? (peak - final) / peak * 100 : 0;

            Console.WriteLine("\n" + new string('=', 90));
            Console.WriteLine("SAFE BETTING FINAL REPORT");
            Console.WriteLine(new string('=', 90));
            Console.WriteLine($"Initial:     {initial,12:C}");
            Console.WriteLine($"Final:       {final,12:C}");
            Console.WriteLine($"Peak:        {peak,12:C}");
            Console.WriteLine($"Return:      {final - initial,12:C} ({roi,6:F1}%)");
            Console.WriteLine($"Max DD:      {maxDD,12:F1}%");
            Console.WriteLine($"Bets:        {bets.Count,12}");
            Console.WriteLine($"Win Rate:    {winRate,12:F1}%");
            Console.WriteLine($"Modes:       {modes.Count,12}");
            Console.WriteLine(new string('=', 90));
        }

        static void ExportBetsToCsv(List<BetRecord> bets, string file)
        {
            var lines = new List<string> { "Trial,Mode,ZScore,BetSide,BetSize,Outcome,Won,PnL,Bankroll" };
            lines.AddRange(bets.Select(b =>
                $"{b.Trial},{b.Mode},{b.ZScore:F3},{b.BetSide},{b.BetSize:F2},{b.Outcome},{b.Won},{b.PnL:F2},{b.Bankroll:F2}"));
            File.WriteAllLines(file, lines);
        }
    }

    class Mode { public string Type; public int StartTrial; public double ZScore; }
    class ModeReport
    {
        public string ModeType; public int StartTrial; public double ZScore;
        public int EndTrial; public int TrialsBeforeReversal; public string EndReason; public int MaxContinuation;
    }
    class BetRecord
    {
        public int Trial; public string Mode; public double ZScore; public string BetSide;
        public double BetSize; public string Outcome; public bool Won; public double PnL; public double Bankroll;
    }
}