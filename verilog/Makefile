SIM ?= icarus
TOPLEVEL_LANG ?= verilog

# --- adjust this path to match your container ---
PDK_HD = /foss/pdks/ciel/sky130/versions/f6eeac7dad085ffcc829ccfd721f7b4ce39edcf7/sky130A/libs.ref/sky130_fd_sc_hd/verilog

# your top-only, gate-level puzzle netlist (same style as adder_demo_top.v)
VERILOG_SOURCES += $(PWD)/puzzle_top.v
VERILOG_SOURCES += $(PDK_HD)/primitives.v
VERILOG_SOURCES += $(PDK_HD)/sky130_fd_sc_hd.v

COMPILE_ARGS += -DUSE_POWER_PINS

TOPLEVEL = puzzle
MODULE = test_puzzle

include $(shell cocotb-config --makefiles)/Makefile.sim