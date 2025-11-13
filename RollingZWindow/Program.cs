using System;
using System.Collections.Generic;

namespace GuessingGameSimulation
{
    class Program
    {
        static void Main(string[] args)
        {
            RunSimulation(trialCount: 10000); // Adjust as needed
        }

        static void RunSimulation(int trialCount)
        {
            Random rand = new Random();
            var outcomes = new List<(double value, string label)>(); // (number, UN/OV)
            var modes = new List<ModeReport>();

            const int windowSize = 30;
            const double zThreshold = 2.0;
            const int reversalDiff = 5;
            const int maxTrialsWithoutReversal = 100;

            Mode currentMode = null;
            int? modeStartTrial = null;
            int ovInSyncCount = 0;
            int unInAntiSyncCount = 0;
            int maxContinuationInMode = 0;
            int continuationStreak = 0;

            for (int trial = 1; trial <= trialCount; trial++)
            {
                double number = rand.NextDouble() * 100.0; // 0.00 to 100.0 inclusive
                string label = number <= 50.00 ? "UN" : "OV";
                outcomes.Add((number, label));

                // Maintain rolling window of 30
                if (outcomes.Count > windowSize)
                    outcomes.RemoveAt(0);

                // Only compute z-score if we have full window
                if (outcomes.Count == windowSize)
                {
                    int ovCount = 0;
                    foreach (var o in outcomes)
                        if (o.label == "OV") ovCount++;

                    double p = 0.5;
                    double expected = windowSize * p;
                    double stdDev = Math.Sqrt(windowSize * p * (1 - p));
                    double z = (ovCount - expected) / stdDev;

                    bool shouldEnterSync = z >= zThreshold;
                    bool shouldEnterAntiSync = z <= -zThreshold;

                    // === MODE ENTRY ===
                    if (currentMode == null)
                    {
                        if (shouldEnterSync)
                        {
                            EnterMode("SYNC", trial, z, ref currentMode, ref modeStartTrial, ref ovInSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
                        }
                        else if (shouldEnterAntiSync)
                        {
                            EnterMode("ANTI-SYNC", trial, z, ref currentMode, ref modeStartTrial, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak, modes);
                        }
                    }
                    else
                    {
                        // === WE ARE IN A MODE ===
                        int trialsInMode = trial - modeStartTrial.Value;

                        // Update continuation streak
                        if (currentMode.Type == "SYNC")
                        {
                            if (label == "OV")
                            {
                                ovInSyncCount++;
                                continuationStreak++;
                                maxContinuationInMode = Math.Max(maxContinuationInMode, continuationStreak);
                            }
                            else
                            {
                                continuationStreak = 0;
                            }

                            int unCount = windowSize - ovCount;
                            int diff = unCount - ovCount;

                            // Reversal: 5 more UN than OV
                            if (diff >= reversalDiff)
                            {
                                EndMode(trial, trialsInMode, "reached 5", maxContinuationInMode, currentMode, modes);
                                ResetMode(ref currentMode, ref modeStartTrial, ref ovInSyncCount, ref maxContinuationInMode, ref continuationStreak);
                                continue;
                            }
                        }
                        else if (currentMode.Type == "ANTI-SYNC")
                        {
                            if (label == "UN")
                            {
                                unInAntiSyncCount++;
                                continuationStreak++;
                                maxContinuationInMode = Math.Max(maxContinuationInMode, continuationStreak);
                            }
                            else
                            {
                                continuationStreak = 0;
                            }

                            int unCount = windowSize - ovCount;
                            int diff = ovCount - unCount;

                            // Reversal: 5 more OV than UN
                            if (diff >= reversalDiff)
                            {
                                EndMode(trial, trialsInMode, "reached 5", maxContinuationInMode, currentMode, modes);
                                ResetMode(ref currentMode, ref modeStartTrial, ref unInAntiSyncCount, ref maxContinuationInMode, ref continuationStreak);
                                continue;
                            }
                        }

                        // === TIMEOUT AFTER 100 TRIALS WITHOUT REVERSAL ===
                        if (trialsInMode >= maxTrialsWithoutReversal)
                        {
                            EndMode(trial, trialsInMode, "timeout (100 trials)", maxContinuationInMode, currentMode, modes);
                            ResetMode(ref currentMode, ref modeStartTrial,
                                ref currentMode.Type == "SYNC" ? ref ovInSyncCount : ref unInAntiSyncCount,
                                ref maxContinuationInMode, ref continuationStreak);

                            // Allow new mode to start on next qualifying z-score
                        }
                    }
                }
            }

            // End any active mode at simulation end
            if (currentMode != null)
            {
                int trialsInMode = trialCount - modeStartTrial.Value;
                string reason = trialsInMode >= maxTrialsWithoutReversal ? "timeout (100 trials)" : "simulation end";
                EndMode(trialCount, trialsInMode, reason, maxContinuationInMode, currentMode, modes);
            }

            // Print final report
            PrintReport(modes);
        }

        static void EnterMode(string type, int trial, double z, ref Mode currentMode, ref int? modeStartTrial,
                              ref int continuationCount, ref int maxContinuation, ref int streak, List<ModeReport> modes)
        {
            currentMode = new Mode { Type = type, StartTrial = trial, ZScore = z };
            modeStartTrial = trial;
            continuationCount = 0;
            maxContinuation = 0;
            streak = 0;

            Console.ForegroundColor = type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{trial}] MODE START: {type} | z-score: {z:F3}");
            Console.ResetColor();
        }

        static void EndMode(int endTrial, int trialsBeforeEnd, string reason, int maxCont, Mode mode, List<ModeReport> modes)
        {
            var report = new ModeReport
            {
                ModeType = mode.Type,
                StartTrial = mode.StartTrial,
                ZScore = mode.ZScore,
                EndTrial = endTrial,
                TrialsBeforeReversal = trialsBeforeEnd,
                EndReason = reason,
                MaxContinuation = maxCont
            };
            modes.Add(report);

            Console.ForegroundColor = mode.Type == "SYNC" ? ConsoleColor.Green : ConsoleColor.Red;
            Console.WriteLine($"[{endTrial}] MODE END: {mode.Type} | End: {reason} | Max cont: {maxCont} | Duration: {trialsBeforeEnd} trials");
            Console.ResetColor();
        }

        static void ResetMode(ref Mode currentMode, ref int? modeStartTrial,
                              ref int count, ref int maxCont, ref int streak)
        {
            currentMode = null;
            modeStartTrial = null;
            count = 0;
            maxCont = 0;
            streak = 0;
        }

        static void PrintReport(List<ModeReport> modes)
        {
            Console.WriteLine("\n" + new string('=', 90));
            Console.WriteLine("FINAL MODE REPORT");
            Console.WriteLine(new string('=', 90));
            Console.WriteLine($"{"Type",-10} {"Start",-6} {"z-score",-8} {"End",-6} {"Trials",-7} {"End Reason",-25} {"Max Cont"}");
            Console.WriteLine(new string('-', 90));

            foreach (var m in modes)
            {
                Console.WriteLine($"{m.ModeType,-10} {m.StartTrial,-6} {m.ZScore,-8:F3} {m.EndTrial,-6} {m.TrialsBeforeReversal,-7} {m.EndReason,-25} {m.MaxContinuation}");
            }

            Console.WriteLine(new string('=', 90));
            Console.WriteLine($"Total Modes Triggered: {modes.Count}");
        }
    }

    class Mode
    {
        public string Type { get; set; } // SYNC or ANTI-SYNC
        public int StartTrial { get; set; }
        public double ZScore { get; set; }
    }

    class ModeReport
    {
        public string ModeType { get; set; }
        public int StartTrial { get; set; }
        public double ZScore { get; set; }
        public int EndTrial { get; set; }
        public int TrialsBeforeReversal { get; set; }
        public string EndReason { get; set; }
        public int MaxContinuation { get; set; }
    }
}