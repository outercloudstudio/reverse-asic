#include "Vpuzzle.h"
#include "verilated.h"
#include "verilated_vcd_c.h"
#include <cstdio>
#include <vector>
#include <cstdint>
#include <memory>

static void tick(Vpuzzle* dut) {
    dut->clk = 1;
    dut->eval();
    dut->clk = 0;
    dut->eval();
}

static void reset_dut(Vpuzzle* dut) {
    dut->VPWR = 1;
    dut->VGND = 0;
    dut->rst_n = 0;
    dut->enable = 0;
    dut->I = 0;
    dut->eval();

    tick(dut);
    
	tick(dut);
    
	dut->rst_n = 1;
    
	tick(dut);
}

static uint8_t read_output(Vpuzzle* dut) {
    return (dut->O_7_ << 7)
		| (dut->O_6_ << 6)
		| (dut->O_5_ << 5)
		| (dut->O_4_ << 4)
		| (dut->O_3_ << 3)
		| (dut->O_2_ << 2)
		| (dut->O_1_ << 1)
		| (dut->O_0_ << 0);
}

static uint8_t read_counter1(Vpuzzle* dut) {
    return (dut->counter1_3 << 3)
		| (dut->counter1_2 << 2)
		| (dut->counter1_1 << 1)
		| (dut->counter1_0 << 0);
}

static uint8_t read_counter2(Vpuzzle* dut) {
    return (dut->counter2_3 << 3)
		| (dut->counter2_2 << 2)
		| (dut->counter2_1 << 1)
		| (dut->counter2_0 << 0);
}

static uint8_t read_locked(Vpuzzle* dut) {
    return dut->locked;
}

static uint8_t read_dbg(Vpuzzle* dut) {
    return dut->dbg;
}

int main(int argc, char** argv) {
    Verilated::commandArgs(argc, argv);
    auto dut = std::make_unique<Vpuzzle>();

    reset_dut(dut.get());

    // std::vector<int> input = { 2, 4, 7, 9, 27, 29, 31, 44, 48, 50, 57, 63, 66, 76, 82, 89, 91, 98, 105, 107, 111, 113 };
	
	for(int n = 0; n < 121; n++) {
		reset_dut(dut.get());

		dut->enable = 1;
		dut->I = 0;
		dut->eval();

		for(int cycle = 0; cycle < n; cycle++) {
			tick(dut.get());
		}

		dut->I = 1;
		dut->eval();

		int dbg = read_dbg(dut.get());

		int x = n % 11;
		int y = n / 11;

		if(dbg) {
			int counter1 = read_counter1(dut.get());
			int counter2 = read_counter2(dut.get());
			int locked = read_locked(dut.get());
			printf("%02d, %02d\n", x, y);
		}
	}

    // dut->enable = 0;
    // dut->eval();

    // uint8_t out = read_output(dut.get());
    // int success = dut->success;
    // printf("cycle 0: O=%d (0x%02x) '%c' success=%d\n", out, out, out, success);

    // for (int i = 1; i < 12; i++) {
    //     tick(dut.get());
    //     out = read_output(dut.get());
    //     success = dut->success;
    //     printf("cycle %d: O=%d (0x%02x) '%c' success=%d\n", i, out, out, out, success);
    // }

    return 0;
}