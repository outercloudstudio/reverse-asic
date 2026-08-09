`timescale 1ns/1ps

module tb_puzzle;

    // --- swap the bitstream by editing input_bits.txt, then just re-run
    //     `vvp sim.vvp` -- no recompile needed, since $readmemb loads it
    //     at simulation runtime, not at compile time.
    parameter NUM_BITS = 121;     // change if your real input length differs
    parameter IDLE_CYCLES = 12;   // cycles to hold/capture output after enable drops

    reg bitstream [0:NUM_BITS-1];           // unpacked, one bit per array entry

    integer i;

    reg I_drv, clk_drv, enable_drv, rst_n_drv;
    wire I, clk, enable, rst_n;
    assign I      = I_drv;
    assign clk    = clk_drv;
    assign enable = enable_drv;
    assign rst_n  = rst_n_drv;

    reg VPWR_drv, VGND_drv;
    wire VPWR, VGND;
    assign VPWR = VPWR_drv;
    assign VGND = VGND_drv;

    wire O_0_, O_1_, O_2_, O_3_, O_4_, O_5_, O_6_, O_7_, success;
    wire [6:0] count;
    wire toggle11;

    puzzle dut (
        .I(I),
        .O_0_(O_0_),
        .O_1_(O_1_),
        .O_2_(O_2_),
        .O_3_(O_3_),
        .O_4_(O_4_),
        .O_5_(O_5_),
        .O_6_(O_6_),
        .O_7_(O_7_),
        .clk(clk),
        .enable(enable),
        .rst_n(rst_n),
        .success(success),
        .count(count),
        .toggle11(toggle11),
        .VGND(VGND),
        .VPWR(VPWR)
    );

    // clock: 10ns period, matches earlier cocotb testbench convention
    initial clk_drv = 0;
    always #5 clk_drv = ~clk_drv;

    // VCD dump -- open in Surfer, GTKWave, or similar
    initial begin
        $dumpfile("puzzle_sim.vcd");
        $dumpvars(0, tb_puzzle);
    end

    // load the bitstream from an external file at runtime.
    // input_bits.txt format: one line per bit, each line just "0" or "1".
    initial begin
        $readmemb("input_bits.txt", bitstream);
    end

    initial begin
        VPWR_drv  = 1;
        VGND_drv  = 0;
        rst_n_drv = 0;
        enable_drv = 0;
        I_drv     = 0;

        #20;
        rst_n_drv = 1;
        @(negedge clk);

        // drive the bitstream, MSB-first (index 0 first), enable held
        // high throughout -- matches the earlier confirmed protocol
        enable_drv = 1;
        for (i = 0; i < NUM_BITS; i = i + 1) begin
            I_drv = bitstream[i];
            //   $display("t=%0t : counterval %d",$time, {toggle11,count});
            @(negedge clk);
        end


        // drop enable -- output becomes valid starting immediately
        // (first sample is taken with no extra edge wait, matching the
        // real hardware timing established earlier), then IDLE_CYCLES-1
        // more samples on subsequent falling edges
        enable_drv = 0;
        $display("t=%0t : enable dropped, capturing output", $time);
        $display("  cycle 0: O=%b%b%b%b%b%b%b%b success=%b",
                  O_0_, O_1_, O_2_, O_3_, O_4_, O_5_, O_6_, O_7_, success);

        for (i = 1; i < IDLE_CYCLES; i = i + 1) begin
            @(negedge clk);
            $display("  cycle %0d: O=%b%b%b%b%b%b%b%b success=%b",
                      i, O_0_, O_1_, O_2_, O_3_, O_4_, O_5_, O_6_, O_7_, success);
        end

        $display("Simulation complete. Waveform: puzzle_sim.vcd");
        $finish;
    end

endmodule
