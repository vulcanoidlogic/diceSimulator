#!/usr/bin/env python3
import csv
import sys
from collections import defaultdict, namedtuple

CSV_PATH = sys.argv[1] if len(sys.argv) > 1 else r"s:\SAIC\Git_projects\homeProjects\diceSimulator\data\with-trial-sorted.csv"

HORIZONS = [30, 100, None]  # None means all

def analyze(path):
    # Read CSV and group rows by Chester in order (store rich row dicts)
    import io
    groups = defaultdict(list)
    with open(path, 'rb') as bf:
        raw = bf.read()
    text = None
    for enc in ('utf-8-sig', 'utf-16', 'latin-1'):
        try:
            text = raw.decode(enc)
            break
        except Exception:
            text = None
    if text is None:
        text = raw.decode('latin-1', errors='replace')

    dr = csv.DictReader(io.StringIO(text))
    for row in dr:
        ch = row['Chester']
        try:
            trial = int(row['TrialNumber'])
        except Exception:
            trial = int(float(row['TrialNumber']))
        try:
            co = int(row['CountOver'])
        except Exception:
            co = int(float(row['CountOver']))
        try:
            cu = int(row['CountUnder'])
        except Exception:
            cu = int(float(row['CountUnder']))
        try:
            diff_pct = float(row.get('DifferencePercent', 0.0))
        except Exception:
            diff_pct = 0.0
        ng = row['NextGuess'].strip().lower()
        groups[ch].append({'trial': trial, 'count_over': co, 'count_under': cu, 'diff_pct': diff_pct, 'nextguess': ng})

    # Build bets per chester based on next-row CountOver change
    bets_per_ch = {}
    for ch, seq in groups.items():
        bets = []
        for i in range(len(seq)-1):
            row = seq[i]
            nextrow = seq[i+1]
            co = row['count_over']
            co_next = nextrow['count_over']
            ng = row['nextguess']
            # Apply user's exact rule:
            # - If NextGuess == 'over': win only if next CountOver > current; otherwise loss (includes equal or decrease).
            # - If NextGuess == 'under': win if next CountOver < current OR next CountOver == current (i.e., next CountOver <= current); otherwise loss.
            if ng == 'over':
                if co_next > co:
                    bets.append('win')
                else:
                    bets.append('loss')
            elif ng == 'under':
                if co_next <= co:
                    bets.append('win')
                else:
                    bets.append('loss')
            else:
                # unexpected label; count as loss to be conservative
                bets.append('loss')
        bets_per_ch[ch] = bets
    # compute horizon stats
    def stats_for(bets):
        wins = bets.count('win')
        losses = bets.count('loss')
        pushes = bets.count('push')
        total_stake = wins + losses  # pushes are no-action
        net_profit = wins * 0.98 - losses * 1.0
        roi = (net_profit / total_stake) if total_stake > 0 else None
        win_rate = wins / (wins + losses) if (wins+losses)>0 else None
        return dict(wins=wins, losses=losses, pushes=pushes, total_stake=total_stake, net_profit=net_profit, roi=roi, win_rate=win_rate)

    # prepare ranking for each horizon
    out = {}
    for h in HORIZONS:
        horizon_name = f'last_{h}' if h else 'all'
        rows = []
        for ch, bets in bets_per_ch.items():
            slice_bets = bets if h is None else bets[-h:]
            s = stats_for(slice_bets)
            s['chester'] = ch
            s['bets_considered'] = len(slice_bets)
            rows.append(s)
        # sort by ROI descending, placing None at bottom
        rows_sorted = sorted(rows, key=lambda r: (r['roi'] is not None, r['roi']), reverse=True)
        out[horizon_name] = rows_sorted
    return out, groups

if __name__ == '__main__':
    out, groups = analyze(CSV_PATH)
    topN = 5
    for horizon, rows in out.items():
        print('\n=== TOP PICKS by ROI for horizon:', horizon, ' (top', topN,') ===')
        print('chester,wins,losses,pushes,bets,win_rate,net_profit,total_stake,ROI')
        c=0
        for r in rows:
            if r['roi'] is None:
                continue
            # require minimum sample size of 5 bets
            if r['bets_considered'] < 5:
                continue
            print(f"{r['chester']},{r['wins']},{r['losses']},{r['pushes']},{r['bets_considered']},{r['win_rate']:.4f},{r['net_profit']:.4f},{r['total_stake']},{r['roi']:.4f}")
            c+=1
            if c>=topN:
                break
        if c==0:
            print('No chester met the minimum sample or had definable ROI for this horizon.')

    # Also print a compact recommendation: best single chester for each horizon by ROI
    print('\n=== Recommendation (best by ROI per horizon) ===')
    for horizon, rows in out.items():
        best = None
        for r in rows:
            if r['roi'] is None or r['bets_considered']<5:
                continue
            best = r
            break
        if best:
            ev_per_bet = best['net_profit'] / best['total_stake']
            print(f"{horizon}: Recommend {best['chester']} — ROI={best['roi']:.4f}, win_rate={best['win_rate']:.3f}, bets={best['bets_considered']}, EV_per_bet={ev_per_bet:.4f} units (stake=1)")
        else:
            print(f"{horizon}: No suitable Chester (min 5 bets) found.")

    # --- D'Alembert simulation for recommended picks ---
    # parameters from user
    base_unit = 0.03  # dollars per unit
    starting_bankroll = 30.0

    def simulate_dalembert(bets_sequence, base_unit=0.03, starting_bankroll=30.0):
        bankroll = starting_bankroll
        stake_units = 1
        max_bankroll = bankroll
        max_drawdown = 0.0
        bets_placed = 0
        ruined = False
        for outcome in bets_sequence:
            if outcome == 'push':
                continue
            stake = stake_units * base_unit
            if stake > bankroll:
                ruined = True
                break
            # place bet
            bets_placed += 1
            if outcome == 'win':
                bankroll += stake * 0.98
                stake_units = max(1, stake_units - 1)
            else:
                bankroll -= stake
                stake_units += 1
            if bankroll > max_bankroll:
                max_bankroll = bankroll
            drawdown = max_bankroll - bankroll
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        return dict(final_bankroll=bankroll, ruined=ruined, bets_placed=bets_placed, max_drawdown=max_drawdown)

    print('\n=== D\'Alembert simulation for recommended picks ===')
    for h in HORIZONS:
        horizon_name = f'last_{h}' if h else 'all'
        rows = out[horizon_name]
        best = None
        for r in rows:
            if r['roi'] is None or r['bets_considered']<5:
                continue
            best = r
            break
        if not best:
            print(f"{horizon_name}: no pick")
            continue
        ch = best['chester']
        seq = groups[ch]
        bets = []
        for i in range(len(seq)-1):
            row = seq[i]
            nextrow = seq[i+1]
            ng = row['nextguess']
            co = row['count_over']
            co_next = nextrow['count_over']
            if co_next == co:
                bets.append('push')
            else:
                if ng == 'over':
                    bets.append('win' if co_next > co else 'loss')
                elif ng == 'under':
                    bets.append('win' if co_next < co else 'loss')
                else:
                    bets.append('push')
        seq_bets = bets if h is None else bets[-h:]
        sim = simulate_dalembert(seq_bets, base_unit=base_unit, starting_bankroll=starting_bankroll)
        print(f"{horizon_name}: {ch} — final_bankroll=${sim['final_bankroll']:.2f}, ruined={sim['ruined']}, bets_placed={sim['bets_placed']}, max_drawdown=${sim['max_drawdown']:.2f}")

    # --- Conditional analysis: Trial >= 500 and DifferencePercent > 5% ---
    cond_trial = 500
    cond_diff_pct = 5.0
    cond_results = []
    total_wins = 0
    total_losses = 0
    for ch, seq in groups.items():
        wins = 0
        losses = 0
        cases = 0
        # iterate through seq but stop at last index-1
        for i in range(len(seq)-1):
            row = seq[i]
            nextrow = seq[i+1]
            if row['trial'] < cond_trial:
                continue
            if row['diff_pct'] <= cond_diff_pct:
                continue
            # determine actual outcome via count_over change
            co = row['count_over']
            co_next = nextrow['count_over']
            ng = row['nextguess']
            # Apply same rule for conditional analysis: under wins on equal or decrease; over wins only on increase
            is_win = False
            if ng == 'over':
                is_win = (co_next > co)
            elif ng == 'under':
                is_win = (co_next <= co)
            else:
                # unexpected label; treat as loss
                is_win = False
            cases += 1
            if is_win:
                wins += 1
            else:
                losses += 1
        total_wins += wins
        total_losses += losses
        total_stake = wins + losses
        net_profit = wins * 0.98 - losses * 1.0
        roi = (net_profit / total_stake) if total_stake > 0 else None
        win_rate = (wins / total_stake) if total_stake > 0 else None
        cond_results.append({'chester': ch, 'cases': cases, 'wins': wins, 'losses': losses, 'win_rate': win_rate, 'roi': roi, 'net_profit': net_profit, 'total_stake': total_stake})

    # sort and print top chesters by ROI under condition
    cond_results_sorted = sorted(cond_results, key=lambda r: (r['roi'] is not None, r['roi']), reverse=True)
    # write CSV export for downstream review
    try:
        import os, csv as _csv
        out_path = os.path.abspath(os.path.join(os.path.dirname(CSV_PATH), 'results_conditional.csv'))
        with open(out_path, 'w', newline='', encoding='utf-8') as cf:
            writer = _csv.writer(cf)
            writer.writerow(['chester','cases','wins','losses','win_rate','net_profit','total_stake','ROI'])
            for r in cond_results_sorted:
                # write all rows (including small samples); user can filter locally
                win_rate = f"{r['win_rate']:.4f}" if r['win_rate'] is not None else ''
                roi = f"{r['roi']:.4f}" if r['roi'] is not None else ''
                writer.writerow([r['chester'], r['cases'], r['wins'], r['losses'], win_rate, f"{r['net_profit']:.4f}", r['total_stake'], roi])
    except Exception as e:
        # non-fatal: report error and continue printing
        print(f"Warning: failed to write CSV export: {e}")
        out_path = None

    print('\n=== Conditional results: Trial>=500 AND DifferencePercent>5% (top 20 by ROI) ===')
    print('chester,cases,wins,losses,win_rate,net_profit,total_stake,ROI')
    c = 0
    for r in cond_results_sorted:
        if r['roi'] is None:
            continue
        if r['cases'] < 5:
            continue
        print(f"{r['chester']},{r['cases']},{r['wins']},{r['losses']},{r['win_rate']:.4f},{r['net_profit']:.4f},{r['total_stake']},{r['roi']:.4f}")
        c += 1
        if c >= 20:
            break
    # aggregate
    total_stake_all = total_wins + total_losses
    overall_net = total_wins * 0.98 - total_losses * 1.0
    overall_win_rate = (total_wins / total_stake_all) if total_stake_all>0 else None
    overall_roi = (overall_net / total_stake_all) if total_stake_all>0 else None
    print(f"\nAggregate across all Chesters under condition: cases={total_stake_all}, wins={total_wins}, losses={total_losses}, win_rate={overall_win_rate:.4f}, ROI={overall_roi:.4f}")
    if out_path:
        print(f"\nWrote CSV export: {out_path}")
