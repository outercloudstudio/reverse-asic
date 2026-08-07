"""
cocotb test for adder_demo.

Drives every possible byte value (0-255) serially into A and B (MSB first,
one bit per clock, matching the earlier hand-written testbench), captures
the S output bit sequence for each, and logs everything to a CSV for
offline analysis -- useful for reverse-engineering what the design
actually computes.
"""

import csv
import cocotb
from cocotb.clock import Clock
from cocotb.triggers import FallingEdge, Timer


async def reset_dut(dut):
    dut.VPWR.value = 1
    dut.VGND.value = 0
    dut.rst_n.value = 0
    dut.en.value = 0
    dut.A.value = 0
    dut.B.value = 0
    await Timer(20, units="ns")
    dut.rst_n.value = 1
    dut.en.value = 1
    await FallingEdge(dut.clk)


async def send_byte_serial(dut, byte_val):
    """Shift byte_val into A and B, MSB first, one bit per clock cycle.
    Returns the list of S values sampled on each of those cycles."""
    outputs = []
    for i in range(7, -1, -1):
        bit = (byte_val >> i) & 1
        dut.A.value = bit
        dut.B.value = bit
        await FallingEdge(dut.clk)
        outputs.append(int(dut.S.value))
    return outputs


@cocotb.test()
async def sweep_all_bytes(dut):
    clock = Clock(dut.clk, 10, units="ns")
    cocotb.start_soon(clock.start())

    await reset_dut(dut)

    with open("sweep_results.csv", "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["input_byte_decimal", "input_byte_binary", "output_bit_sequence"])

        for value in range(256):
            outputs = await send_byte_serial(dut, value)
            out_str = "".join(str(b) for b in outputs)
            writer.writerow([value, format(value, "08b"), out_str])
            dut._log.info(f"A=B={value:3d} (0b{value:08b}) -> S sequence = {out_str}")

    dut._log.info("Sweep complete. Results in sweep_results.csv")


@cocotb.test()
async def single_value_248(dut):
    """Focused test matching the earlier hand-written testbench: send 248."""
    clock = Clock(dut.clk, 10, units="ns")
    cocotb.start_soon(clock.start())

    await reset_dut(dut)
    outputs = await send_byte_serial(dut, 248)
    out_str = "".join(str(b) for b in outputs)
    dut._log.info(f"248 (0b11111000) -> S sequence = {out_str}")
