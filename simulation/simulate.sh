verilator --cc --trace --exe --build --pins-inout-enables -j 0  ./simulate.cpp -f ./filelist.f --top puzzle
./obj_dir/Vpuzzle