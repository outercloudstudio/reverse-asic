"""
cocotb test for `puzzle`.

Port shape (from the module you pasted):
    I            - single-bit serial input
    O_0_..O_7_   - 8-bit parallel output
    clk, enable, rst_n
    success      - flag output
    VGND, VPWR   - power pins (real ports on this module)

cocotb attaches directly to `puzzle` (no wrapper needed) -- VGND/VPWR are
driven directly like any other signal.

Protocol:
    1. reset (enable low)
    2. enable high while I is driven, one bit per cycle (any length)
    3. enable drops low once input is done
    4. output is read on each of the next >=12 cycles while enable is
       low -- outputs aren't meaningful during step 2, so we don't
       bother reading them there.
"""

import csv
import os
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import FallingEdge, Timer


def bits_from_int(value, width=8):
    """Helper: turn an int into an MSB-first list of bits, e.g.
    bits_from_int(248, width=8) -> [1,1,1,1,1,0,0,0]"""
    return [(value >> i) & 1 for i in range(width - 1, -1, -1)]


def bitstream_to_str(bitstream):
    return "".join(str(b) for b in bitstream)


async def reset_dut(dut):
    dut.VPWR.value = 1
    dut.VGND.value = 0
    dut.rst_n.value = 0
    dut.enable.value = 0
    dut.I.value = 0
    await Timer(20, units="ns")
    dut.rst_n.value = 1
    await FallingEdge(dut.clk)


def read_outputs(dut):
    """Read O_0_..O_7_ as an 8-bit int, O_7_ as MSB."""
    bits = [
        int(dut.O_7_.value), int(dut.O_6_.value), int(dut.O_5_.value),
        int(dut.O_4_.value), int(dut.O_3_.value), int(dut.O_2_.value),
        int(dut.O_1_.value), int(dut.O_0_.value),
    ]
    val = 0
    for b in bits:
        val = (val << 1) | b
    return val, "".join(str(b) for b in bits)


async def send_byte_serial(dut, bitstream):
    """Shift an arbitrary-length list of bits into I, one bit per clock
    cycle, with enable held high throughout. Does NOT read outputs --
    they aren't meaningful yet while input is still being clocked in."""
    dut.enable.value = 1
    for bit in bitstream:
        dut.I.value = bit & 1
        await FallingEdge(dut.clk)


async def capture_output(dut, cycles=12):
    """Drop enable (input phase is over) and read the output bits +
    success flag on each of the next `cycles` samples -- this is the
    window where the real output actually appears. The first sample is
    read immediately (no edge wait), since that's the already-settled
    idle value at the moment enable drops; the remaining cycles-1
    samples are taken on subsequent falling edges. Returns a list of
    (out_int, out_bin, success)."""
    dut.enable.value = 0
    history = []

    out_int, out_bin = read_outputs(dut)
    success = int(dut.success.value)
    history.append((out_int, out_bin, success))

    for _ in range(cycles - 1):
        await FallingEdge(dut.clk)
        out_int, out_bin = read_outputs(dut)
        success = int(dut.success.value)
        history.append((out_int, out_bin, success))

    return history


@cocotb.test()
async def single_value(dut):
    """Send one specific bitstream and print what happens. Edit
    TEST_BITS to try a specific guess -- any length, not just 8 bits."""
    TEST_BITS = [1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0]

    clock = Clock(dut.clk, 10, units="ns")
    cocotb.start_soon(clock.start())

    await reset_dut(dut)
    await send_byte_serial(dut, TEST_BITS)
    history = await capture_output(dut, cycles=12)

    for i, (out_int, out_bin, success) in enumerate(history):
        dut._log.info(
            f"output cycle {i}: O={out_bin} ({out_int}) success={success}"
        )

    final_out, final_bin, final_success = history[-1]
    dut._log.info(
        f"input={bitstream_to_str(TEST_BITS)} -> "
        f"final O={final_bin} ({final_out}) success={final_success}"
    )


@cocotb.test()
async def sweep_all_bitstreams(dut):
    """Brute-force every possible bitstream of length SWEEP_LENGTH
    (2**SWEEP_LENGTH total combinations, MSB-first), log outputs +
    success flag for each to CSV, and flag any input that ever asserts
    success. Edit SWEEP_LENGTH below to change the sweep width.

    Supports sharding for parallel runs: set env vars
    SWEEP_SHARD_INDEX and SWEEP_SHARD_COUNT (e.g. via
    run_parallel_sweep.py) to have this process only cover its slice
    of the full range. Defaults to shard 0 of 1 (the whole range) if
    unset, so a plain `make` still does the full sweep as before.
    """
    SWEEP_LENGTH = 8  # number of bits per candidate; total tries = 2**SWEEP_LENGTH

    shard_index = int(os.environ.get("SWEEP_SHARD_INDEX", "0"))
    shard_count = int(os.environ.get("SWEEP_SHARD_COUNT", "1"))

    total = 2 ** SWEEP_LENGTH
    chunk = (total + shard_count - 1) // shard_count
    start = shard_index * chunk
    end = min(start + chunk, total)

    if SWEEP_LENGTH > 20 and shard_count == 1:
        dut._log.warning(
            f"SWEEP_LENGTH={SWEEP_LENGTH} means {total:,} combinations on a "
            f"single process -- consider run_parallel_sweep.py to split this "
            f"across multiple cores."
        )

    clock = Clock(dut.clk, 10, units="ns")
    cocotb.start_soon(clock.start())

    successes = []
    out_path = f"puzzle_sweep_results_shard{shard_index}.csv" if shard_count > 1 else "puzzle_sweep_results.csv"

    with open(out_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "input_decimal", "input_binary",
            "final_output_decimal", "final_output_binary",
            "success_ever_asserted", "final_success",
        ])

        for value in range(start, end):
            bitstream = bits_from_int(value, width=SWEEP_LENGTH)

            await reset_dut(dut)
            await send_byte_serial(dut, bitstream)
            history = await capture_output(dut, cycles=12)

            final_out, final_bin, final_success = history[-1]
            success_ever = int(any(s for _, _, s in history))

            writer.writerow([
                value, format(value, f"0{SWEEP_LENGTH}b"),
                final_out, final_bin,
                success_ever, final_success,
            ])

            if success_ever:
                successes.append(value)
                dut._log.info(
                    f"*** SUCCESS on input {value} "
                    f"(0b{format(value, f'0{SWEEP_LENGTH}b')}) *** "
                    f"final O={final_bin}"
                )

    if successes:
        dut._log.info(f"Inputs that asserted success: {successes}")
    else:
        dut._log.info(
            f"No success in this shard's range [{start}, {end}). "
            "Try a different SWEEP_LENGTH, or check other shards' results."
        )

    dut._log.info(f"Sweep complete (range [{start}, {end})). Results in {out_path}")


# --- vectors extracted from example_inputs.vcd (uploaded reference trace) ---
# Both example transactions produce the ASCII message "TRY AGAIN" on the
# output (success=0 throughout) -- these are documented wrong-answer
# examples showing the correct 121-bit input protocol and 12-cycle
# output-capture window, not solutions.

VCD_TRANSACTIONS = [
    {
        "input_bits": [0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0],
        "expected_output": [0, 84, 82, 89, 32, 65, 71, 65, 73, 78, 0, 0],
    },
    {
        "input_bits": [1, 1, 0, 1, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
        "expected_output": [0, 84, 82, 89, 32, 65, 71, 65, 73, 78, 0, 0],
    },
]


@cocotb.test()
async def vcd_replay(dut):
    """Replay each transaction recorded in example_inputs.vcd against the
    DUT and check the output matches exactly. This is a regression check
    that your extraction/simulation setup reproduces the reference
    behavior -- not a search for the puzzle solution (both example
    transactions are known wrong-answer "TRY AGAIN" cases)."""
    clock = Clock(dut.clk, 10, units="ns")
    cocotb.start_soon(clock.start())

    all_passed = True

    for idx, txn in enumerate(VCD_TRANSACTIONS):
        await reset_dut(dut)
        await send_byte_serial(dut, txn["input_bits"])
        history = await capture_output(dut, cycles=12)

        actual_output = [h[0] for h in history]
        expected_output = txn["expected_output"]

        match = actual_output == expected_output
        all_passed = all_passed and match

        status = "MATCH" if match else "MISMATCH"
        dut._log.info(f"transaction {idx}: {status}")
        dut._log.info(f"  expected: {expected_output}")
        dut._log.info(f"  actual:   {actual_output}")

        if not match:
            diffs = [
                (i, e, a) for i, (e, a) in enumerate(zip(expected_output, actual_output))
                if e != a
            ]
            dut._log.info(f"  diffs (cycle, expected, actual): {diffs}")

        assert match, f"transaction {idx} output did not match VCD reference"

    if all_passed:
        dut._log.info("All VCD-recorded transactions replayed and matched exactly.")