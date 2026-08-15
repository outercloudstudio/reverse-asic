

const counter_Bit0 = new Register(!(counterIs11 || (counter_Bit0 === enableGate)), rst_n) // counter_Bit0
const and3_2_14 = (counter_Bit1 && counter_Bit0 && enableGate) // and3_2_14
const counter_Bit1 = new Register(!((enableGate && counterIs11) || !((counter_Bit0 && enableGate) || counter_Bit1) || and3_2_14), rst_n) // counter_Bit1
const counter_Bit2 = new Register((counter_Bit2 !== and3_2_14), rst_n) // counter_Bit2
const counter_Bit3 = new Register(!((enableGate && counterIs11) || ((counter_Bit1 && counter_Bit0 && counter_Bit2 && enableGate) && counter_Bit3) || !((counter_Bit1 && counter_Bit0 && counter_Bit2 && enableGate) || counter_Bit3)), rst_n) // counter_Bit3
const counterIs11 = (!counter_Bit0 && !counter_Bit2 && counter_Bit3 && counter_Bit1) // counterIs11
const and4_2_2 = (counterIs11 && enableGate && counter2_Bit1 && counter2_Bit0) // and4_2_2
const nand2_2_23 = !(counterIs11 && enableGate) // nand2_2_23
const counter2_Bit1 = new Register(((lockBitComp2 || nand2_2_23) && ((counterIs11 && enableGate && counter2_Bit0) || counter2_Bit1) && !and4_2_2), rst_n) // counter2_Bit1
const counter2_Bit3 = new Register((counter2_Bit3 !== and4_2_2), rst_n) // counter2_Bit3
const counter2_Bit2 = new Register(((counter2_Bit0 || lockBitComp2 || nand2_2_23) && !(counter2_Bit3 && counter2_Bit2 && and4_2_2) && ((counter2_Bit3 && and4_2_2) || counter2_Bit2)), rst_n) // counter2_Bit2
const lockBitComp2 = !(!counter2_Bit3 && counter2_Bit2 && counter2_Bit1) // lockBitComp2
const counter2_Bit0 = new Register((counter2_Bit0 ? (counterIs11 && enableGate && lockBitComp2) : nand2_2_23), rst_n) // counter2_Bit0
const lockRegister = new Register(((counterIs11 && !(counter2_Bit0 || lockBitComp2) && enableGate) || lockRegister), rst_n) // lockRegister
const enableGate = (!lockRegister && enable) // enableGate
const inputShift_00 = register({reset_n: rst_n, clk: clk, next: I, enable: enableGate}) // inputShift_00
const inputShift_01_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_00, enable: enableGate}) // inputShift_01_IGNORED
const inputShift_02_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_01_IGNORED, enable: enableGate}) // inputShift_02_IGNORED
const inputShift_03_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_02_IGNORED, enable: enableGate}) // inputShift_03_IGNORED
const inputShift_04_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_03_IGNORED, enable: enableGate}) // inputShift_04_IGNORED
const inputShift_05_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_04_IGNORED, enable: enableGate}) // inputShift_05_IGNORED
const inputShift_06_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_05_IGNORED, enable: enableGate}) // inputShift_06_IGNORED
const inputShift_07_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_06_IGNORED, enable: enableGate}) // inputShift_07_IGNORED
const inputShift_08_IGNORED = register({reset_n: rst_n, clk: clk, next: inputShift_07_IGNORED, enable: enableGate}) // inputShift_08_IGNORED
const inputShift_09 = register({reset_n: rst_n, clk: clk, next: inputShift_08_IGNORED, enable: enableGate}) // inputShift_09
const inputShift_10 = register({reset_n: rst_n, clk: clk, next: inputShift_09, enable: enableGate}) // inputShift_10
const inputShift_11 = register({reset_n: rst_n, clk: clk, next: inputShift_10, enable: enableGate}) // inputShift_11
const counterGreaterThan0 = (counter_Bit0 || counter_Bit1 || counter_Bit2 || counter_Bit3) // counterGreaterThan0
const counterNot10 = (counter_Bit0 || counter_Bit2 || !counter_Bit3 || !counter_Bit1) // counterNot10
const failRegister1 = new Register(((I && enableGate && ((counterNot10 && inputShift_09) || ('HI' && inputShift_10) || ((counterGreaterThan0 && inputShift_00) || (counterGreaterThan0 && inputShift_11)))) || failRegister1), rst_n) // failRegister1
const lockRegisterBuffered = new Register((lockRegister || lockRegisterBuffered), rst_n) // lockRegisterBuffered
const io8NotTwice = new Register(((io8NotTwice || !((counter_Bit1 || counter_Bit0 || counter_Bit2 || !counter_Bit3) || !(I && enableGate))) && (io8Twice || !io8NotTwice || (counter_Bit1 || counter_Bit0 || counter_Bit2 || !counter_Bit3) || !(I && enableGate))), rst_n) // io8NotTwice
const io8Twice = new Register(((io8NotTwice && !((counter_Bit1 || counter_Bit0 || counter_Bit2 || !counter_Bit3) || !(I && enableGate))) || io8Twice), rst_n) // io8Twice
const dfrtp_2_68 = new Register(!(dfrtp_2_68 && !(I && enableGate && dfrtp_2_73 && (!counter_Bit0 && !counter_Bit2 && counter_Bit3 && counter_Bit1))), rst_n) // dfrtp_2_68
const dfrtp_2_73 = new Register(((dfrtp_2_68 || !(I && enableGate && dfrtp_2_73 && (!counter_Bit0 && !counter_Bit2 && counter_Bit3 && counter_Bit1))) && ((I && enableGate && (!counter_Bit0 && !counter_Bit2 && counter_Bit3 && counter_Bit1)) || dfrtp_2_73)), rst_n) // dfrtp_2_73
const dfrtp_2_74 = new Register(((dfrtp_2_70 || !(I && enableGate && dfrtp_2_74 && (!counter_Bit1 && !counter_Bit2 && counter_Bit3 && counter_Bit0))) && ((I && enableGate && (!counter_Bit1 && !counter_Bit2 && counter_Bit3 && counter_Bit0)) || dfrtp_2_74)), rst_n) // dfrtp_2_74
const dfrtp_2_70 = new Register(!(dfrtp_2_70 && !(I && enableGate && dfrtp_2_74 && (!counter_Bit1 && !counter_Bit2 && counter_Bit3 && counter_Bit0))), rst_n) // dfrtp_2_70
const dfrtp_2_65 = new Register(((dfrtp_2_65 || !((counter_Bit1 || counter_Bit0 || counter_Bit3 || !counter_Bit2) || !(I && enableGate))) && (dfrtp_2_79 || !dfrtp_2_65 || (counter_Bit1 || counter_Bit0 || counter_Bit3 || !counter_Bit2) || !(I && enableGate))), rst_n) // dfrtp_2_65
const dfrtp_2_79 = new Register(((dfrtp_2_65 && !((counter_Bit1 || counter_Bit0 || counter_Bit3 || !counter_Bit2) || !(I && enableGate))) || dfrtp_2_79), rst_n) // dfrtp_2_79
const dfrtp_2_66 = new Register(!(dfrtp_2_66 && !(I && enableGate && dfrtp_2_80 && (!counter_Bit1 && !counter_Bit3 && counter_Bit2 && counter_Bit0))), rst_n) // dfrtp_2_66
const dfrtp_2_80 = new Register(((dfrtp_2_66 || !(I && enableGate && dfrtp_2_80 && (!counter_Bit1 && !counter_Bit3 && counter_Bit2 && counter_Bit0))) && ((I && enableGate && (!counter_Bit1 && !counter_Bit3 && counter_Bit2 && counter_Bit0)) || dfrtp_2_80)), rst_n) // dfrtp_2_80
const dfrtp_2_78 = new Register(((dfrtp_2_64 || !(I && enableGate && dfrtp_2_78 && (!counter_Bit0 && !counter_Bit3 && counter_Bit2 && counter_Bit1))) && ((I && enableGate && (!counter_Bit0 && !counter_Bit3 && counter_Bit2 && counter_Bit1)) || dfrtp_2_78)), rst_n) // dfrtp_2_78
const dfrtp_2_64 = new Register(!(dfrtp_2_64 && !(I && enableGate && dfrtp_2_78 && (!counter_Bit0 && !counter_Bit3 && counter_Bit2 && counter_Bit1))), rst_n) // dfrtp_2_64
const dfrtp_2_67 = new Register(!(dfrtp_2_67 && !(I && enableGate && dfrtp_2_75 && (!counter_Bit3 && counter_Bit2 && counter_Bit0 && counter_Bit1))), rst_n) // dfrtp_2_67
const dfrtp_2_75 = new Register(((dfrtp_2_67 || !(I && enableGate && dfrtp_2_75 && (!counter_Bit3 && counter_Bit2 && counter_Bit0 && counter_Bit1))) && ((I && enableGate && (!counter_Bit3 && counter_Bit2 && counter_Bit0 && counter_Bit1)) || dfrtp_2_75)), rst_n) // dfrtp_2_75
const dfrtp_2_76 = new Register(((dfrtp_2_76 || !((counter_Bit1 || counter_Bit3 || counter_Bit2 || !counter_Bit0) || !(I && enableGate))) && (dfrtp_2_61 || !dfrtp_2_76 || (counter_Bit1 || counter_Bit3 || counter_Bit2 || !counter_Bit0) || !(I && enableGate))), rst_n) // dfrtp_2_76
const dfrtp_2_61 = new Register(((dfrtp_2_76 && !((counter_Bit1 || counter_Bit3 || counter_Bit2 || !counter_Bit0) || !(I && enableGate))) || dfrtp_2_61), rst_n) // dfrtp_2_61
const dfrtp_2_57 = new Register(!(dfrtp_2_57 && !(I && enableGate && dfrtp_2_60 && !(counter_Bit1 || counter_Bit0 || counter_Bit3 || counter_Bit2))), rst_n) // dfrtp_2_57
const dfrtp_2_60 = new Register(((dfrtp_2_57 || !(I && enableGate && dfrtp_2_60 && !(counter_Bit1 || counter_Bit0 || counter_Bit3 || counter_Bit2))) && ((I && enableGate && !(counter_Bit1 || counter_Bit0 || counter_Bit3 || counter_Bit2)) || dfrtp_2_60)), rst_n) // dfrtp_2_60
const dfrtp_2_62 = new Register(((dfrtp_2_62 || !((counter_Bit0 || counter_Bit3 || counter_Bit2 || !counter_Bit1) || !(I && enableGate))) && (dfrtp_2_77 || !dfrtp_2_62 || (counter_Bit0 || counter_Bit3 || counter_Bit2 || !counter_Bit1) || !(I && enableGate))), rst_n) // dfrtp_2_62
const dfrtp_2_77 = new Register(((dfrtp_2_62 && !((counter_Bit0 || counter_Bit3 || counter_Bit2 || !counter_Bit1) || !(I && enableGate))) || dfrtp_2_77), rst_n) // dfrtp_2_77
const dfrtp_2_63 = new Register(!(dfrtp_2_63 && !(I && enableGate && dfrtp_2_71 && (!counter_Bit3 && !counter_Bit2 && counter_Bit0 && counter_Bit1))), rst_n) // dfrtp_2_63
const dfrtp_2_71 = new Register(((dfrtp_2_63 || !(I && enableGate && dfrtp_2_71 && (!counter_Bit3 && !counter_Bit2 && counter_Bit0 && counter_Bit1))) && ((I && enableGate && (!counter_Bit3 && !counter_Bit2 && counter_Bit0 && counter_Bit1)) || dfrtp_2_71)), rst_n) // dfrtp_2_71
const and2_2_1 = (counter_Bit0 && counter2_Bit0) // and2_2_1
const nor2_2_7 = !(counter_Bit0 || counter2_Bit0) // nor2_2_7
const or2_2_1 = (and2_2_1 || nor2_2_7) // or2_2_1
const nand2_2_4 = !(counter_Bit0 && counter2_Bit0) // nand2_2_4
const xor2_2_0 = (counter2_Bit0 !== counter2_Bit1) // xor2_2_0
const xnor2_2_1 = (counter_Bit1 === xor2_2_0) // xnor2_2_1
const nand2_2_7 = !(xnor2_2_1 && nand2_2_4) // nand2_2_7
const nor2_2_0 = !(xnor2_2_1 || nand2_2_4) // nor2_2_0
const and2b_2_0 = (!nor2_2_0 && nand2_2_7) // and2b_2_0
const and2_2_0 = (or2_2_1 && and2b_2_0) // and2_2_0
const xor2_2_7 = (counter2_Bit0 !== counter2_Bit3) // xor2_2_7
const a21oi_2_10 = !((counter2_Bit1 && xor2_2_7) || !(counter2_Bit1 || counter2_Bit3)) // a21oi_2_10
const xor2_2_1 = (counter_Bit2 !== a21oi_2_10) // xor2_2_1
const xnor2_2_0 = (!(counter_Bit1 && xor2_2_0) === xor2_2_1) // xnor2_2_0
const xnor2_2_2 = (xnor2_2_0 === nor2_2_0) // xnor2_2_2
const a32o_2_0 = ((counter_Bit1 && xor2_2_0 && xor2_2_1) || (xnor2_2_0 && nor2_2_0)) // a32o_2_0
const o2bb2a_2_0 = ((!counter_Bit2 || !a21oi_2_10) && (!(counter2_Bit0 && counter2_Bit1) || counter2_Bit3)) // o2bb2a_2_0
const xor2_2_4 = (counter2_Bit2 !== xor2_2_7) // xor2_2_4
const nand2_2_17 = !(counter2_Bit1 && counter2_Bit3) // nand2_2_17
const xnor2_2_4 = (nand2_2_17 === xor2_2_4) // xnor2_2_4
const xnor2_2_5 = (counter_Bit3 === xnor2_2_4) // xnor2_2_5
const xnor2_2_8 = (xnor2_2_5 === o2bb2a_2_0) // xnor2_2_8
const xnor2_2_9 = (a32o_2_0 === xnor2_2_8) // xnor2_2_9
const and3_2_0 = (xnor2_2_9 && xnor2_2_2 && and2_2_0) // and3_2_0
const a21o_2_8 = ((a32o_2_0 && !(xnor2_2_5 && o2bb2a_2_0)) || !(xnor2_2_5 || o2bb2a_2_0)) // a21o_2_8
const nand2b_2_6 = !(nand2_2_17 && xor2_2_4) // nand2b_2_6
const nand2_2_21 = !(counter2_Bit0 && counter2_Bit3) // nand2_2_21
const nand2_2_22 = !(counter2_Bit2 && xor2_2_7) // nand2_2_22
const xnor2_2_3 = (counter2_Bit1 === counter2_Bit2) // xnor2_2_3
const nor2_2_17 = !(nand2_2_21 || xnor2_2_3) // nor2_2_17
const or3_2_5 = (!(counter2_Bit1 || nand2_2_22) || nor2_2_17 || (nand2_2_21 && nand2_2_22 && xnor2_2_3)) // or3_2_5
const nand2_2_16 = !(counter_Bit3 && xnor2_2_4) // nand2_2_16
const a21oi_2_4 = !((nand2b_2_6 && nand2_2_16) || or3_2_5) // a21oi_2_4
const nor2_2_21 = !(a21oi_2_4 || (nand2b_2_6 && nand2_2_16 && or3_2_5)) // nor2_2_21
const xor2_2_8 = (a21o_2_8 !== nor2_2_21) // xor2_2_8
const xor2_2_2 = (a32o_2_0 !== xnor2_2_8) // xor2_2_2
const nor2_2_4 = !(and2_2_1 || nor2_2_7) // nor2_2_4
const nor2_2_1 = !(nor2_2_4 || and2b_2_0) // nor2_2_1
const nor2_2_8 = !(xnor2_2_1 || or2_2_1) // nor2_2_8
const or3_2_0 = (nor2_2_8 || xnor2_2_2 || nor2_2_1) // or3_2_0
const nor2_2_9 = !(nor2_2_7 || nand2_2_7) // nor2_2_9
const nor2_2_2 = !(xnor2_2_2 || nor2_2_9) // nor2_2_2
const or3_2_2 = (nor2_2_8 || nor2_2_1 || nor2_2_2) // or3_2_2
const nand2_2_6 = !(xnor2_2_0 && nor2_2_8) // nand2_2_6
const o22ai_2_0 = !((counter2_Bit1 || nand2_2_22) && (!((counter2_Bit1 && counter2_Bit2) || counter2_Bit3) || ((counter2_Bit1 && counter2_Bit3 && counter2_Bit2) || nor2_2_17))) // o22ai_2_0
const and4bb_2_0 = (!counter2_Bit0 && !counter2_Bit1 && counter2_Bit3 && counter2_Bit2) // and4bb_2_0
const and2b_2_5 = (!and4bb_2_0 && o22ai_2_0) // and2b_2_5
const a21o_2_5 = ((a21o_2_8 && nor2_2_21) || a21oi_2_4) // a21o_2_5
const xnor2_2_10 = (a21o_2_5 === and2b_2_5) // xnor2_2_10
const nand2_2_5 = !(xnor2_2_2 && nor2_2_1) // nand2_2_5
const nand2_2_11 = !(xnor2_2_9 && nand2_2_5) // nand2_2_11
const nand2_2_3 = !(xor2_2_8 && nand2_2_11) // nand2_2_3
const xor2_2_3 = (xnor2_2_0 !== nor2_2_0) // xor2_2_3
const nor2_2_10 = !(xnor2_2_2 || nor2_2_1) // nor2_2_10
const nor2_2_12 = !(xnor2_2_9 || nor2_2_10) // nor2_2_12
const or2_2_0 = (xor2_2_3 || and2b_2_0) // or2_2_0
const nor2_2_11 = !(xor2_2_2 || or2_2_0) // nor2_2_11
const nand2_2_1 = !(xnor2_2_0 && and2b_2_0) // nand2_2_1
const nor2_2_28 = !(xor2_2_2 || nand2_2_1) // nor2_2_28
const a21oi_2_7 = !((a21o_2_5 && o22ai_2_0) || and4bb_2_0) // a21oi_2_7
const a21o_2_4 = ((nand2_2_17 && nor2_2_17) || !((counter2_Bit2 && nand2_2_17) || nor2_2_17)) // a21o_2_4
const xnor2_2_7 = (a21oi_2_7 === a21o_2_4) // xnor2_2_7
const nor2_2_20 = !(!(a21oi_2_7 || a21o_2_4) || ((counter2_Bit0 || counter2_Bit1) && counter2_Bit3 && counter2_Bit2)) // nor2_2_20
const a21oi_2_0 = !((xor2_2_2 && nor2_2_10) || xor2_2_8) // a21oi_2_0
const or2_2_3 = (xnor2_2_9 || nor2_2_1) // or2_2_3
const xor2_2_5 = (a21oi_2_7 !== a21o_2_4) // xor2_2_5
const xor2_2_6 = (a21o_2_5 !== and2b_2_5) // xor2_2_6
const o211a_2_2 = ((((!(nand2_2_6 || xnor2_2_9) || xor2_2_8 || and3_2_0) && xnor2_2_10 && !(xor2_2_8 && (xor2_2_2 ? or3_2_0 : or3_2_2))) || ((xor2_2_6 && ((xnor2_2_2 && or2_2_3) || !a21oi_2_0) && !(xor2_2_8 && !((nor2_2_8 || xor2_2_2 || xor2_2_3) && nand2_2_6))) || xor2_2_5)) && nor2_2_20 && (xnor2_2_7 || ((nand2_2_3 || nor2_2_12) && xnor2_2_10 && (xor2_2_8 || nor2_2_28 || nor2_2_11)) || !((nand2_2_3 && (xor2_2_8 || nor2_2_12 || ((nor2_2_8 || xor2_2_3) && xnor2_2_9 && nand2_2_6))) || xnor2_2_10))) // o211a_2_2
const nand2b_2_0 = !(and2_2_0 && or2_2_0) // nand2b_2_0
const or2_2_2 = (xor2_2_3 || nor2_2_1) // or2_2_2
const nand2_2_9 = !(xnor2_2_0 && nor2_2_9) // nand2_2_9
const o21a_2_0 = ((nor2_2_8 || or2_2_2) && xor2_2_2) // o21a_2_0
const nor2_2_5 = !(nand2_2_6 || xor2_2_2) // nor2_2_5
const nand2_2_0 = !(or2_2_1 && xnor2_2_2) // nand2_2_0
const and3_2_1 = (xnor2_2_9 && !nor2_2_9 && nand2_2_0) // and3_2_1
const o211a_2_3 = ((xor2_2_5 || ((xor2_2_6 && ((xor2_2_8 && nor2_2_5) || !((xnor2_2_9 && nand2_2_9) || o21a_2_0 || xor2_2_8))) || (xnor2_2_10 && ((xnor2_2_0 && xor2_2_8 && and2b_2_0) || nor2_2_12 || and3_2_1) && !((nor2_2_12 || and3_2_1) && xor2_2_8)))) && !((xor2_2_6 || (xor2_2_8 ? (nor2_2_11 || ((xor2_2_2 || nor2_2_9) && or2_2_0)) : ((nand2_2_5 && nor2_2_12) || (or2_2_2 && xnor2_2_9)))) && ((xor2_2_8 && or2_2_0) || (nand2b_2_0 ? nor2_2_12 : xnor2_2_9) || xnor2_2_10) && xor2_2_5) && nor2_2_20) // o211a_2_3
const inv_2_0 = !or2_2_2 // inv_2_0
const o31ai_2_0 = !((xnor2_2_9 || nor2_2_2 || inv_2_0) && xor2_2_8) // o31ai_2_0
const o211a_2_4 = ((xor2_2_5 || !((xor2_2_6 || ((xor2_2_8 || and3_2_0 || !((xnor2_2_9 && and2_2_0) || or3_2_0)) && (o31ai_2_0 || !(xor2_2_2 || nor2_2_10)))) && (xor2_2_8 || xnor2_2_10 || or3_2_2 || o21a_2_0))) && ((xor2_2_8 && !((xnor2_2_9 || nand2_2_5) && ((nor2_2_8 || xor2_2_2 || or2_2_2) || xor2_2_6))) || ((xor2_2_6 || nor2_2_28) && !((xor2_2_6 && ((xnor2_2_9 || nand2_2_9) && !nor2_2_5)) || xor2_2_8)) || xnor2_2_7) && nor2_2_20) // o211a_2_4
const or2_2_4 = (xnor2_2_9 || or2_2_0) // or2_2_4
const o211a_2_5 = ((xor2_2_5 || (xor2_2_6 ? ((xor2_2_8 || and3_2_0 || !(xnor2_2_9 || or3_2_0)) && (!(nor2_2_10 || nand2_2_11) || o31ai_2_0)) : (xor2_2_8 ? ((nor2_2_8 || nand2_2_11) && or2_2_3) : ((xor2_2_2 && nand2_2_1 && nand2_2_0) || and2_2_0)))) && ((xor2_2_6 && ((xor2_2_8 && nand2_2_11 && or2_2_4) || (((xor2_2_2 || nand2b_2_0) && (or2_2_4 || nor2_2_4)) && a21oi_2_0))) || ((nor2_2_2 || !((xor2_2_2 || inv_2_0) && xor2_2_8)) && (((xor2_2_2 || (nand2_2_1 && nand2_2_0)) && or2_2_4) || xor2_2_8) && xnor2_2_10) || xnor2_2_7) && nor2_2_20) // o211a_2_5
const or4b_2_0 = (o211a_2_3 || o211a_2_5 || o211a_2_4 || !o211a_2_2) // or4b_2_0
const nor2_2_15 = !(or4b_2_0 || !(I && enableGate)) // nor2_2_15
const dfrtp_2_1 = new Register(((dfrtp_2_1 || nor2_2_15) && (dfrtp_2_2 || !dfrtp_2_1 || or4b_2_0 || !(I && enableGate))), rst_n) // dfrtp_2_1
const dfrtp_2_2 = new Register(((dfrtp_2_1 && nor2_2_15) || dfrtp_2_2), rst_n) // dfrtp_2_2
const nand2_2_13 = !(I && enableGate) // nand2_2_13
const or4b_2_1 = (o211a_2_2 || o211a_2_5 || o211a_2_4 || !o211a_2_3) // or4b_2_1
const nor2_2_14 = !(or4b_2_1 || nand2_2_13) // nor2_2_14
const dfrtp_2_9 = new Register(((dfrtp_2_9 || nor2_2_14) && (dfrtp_2_3 || !dfrtp_2_9 || or4b_2_1 || nand2_2_13)), rst_n) // dfrtp_2_9
const dfrtp_2_3 = new Register(((dfrtp_2_9 && nor2_2_14) || dfrtp_2_3), rst_n) // dfrtp_2_3
const nor4_2_0 = !(o211a_2_3 || o211a_2_2 || o211a_2_5 || o211a_2_4) // nor4_2_0
const dfrtp_2_0 = new Register(((dfrtp_2_14 || nand4_2_0) && ((I && enableGate && nor4_2_0) || dfrtp_2_0)), rst_n) // dfrtp_2_0
const nand4_2_0 = !(I && enableGate && dfrtp_2_0 && nor4_2_0) // nand4_2_0
const dfrtp_2_14 = new Register(!(dfrtp_2_14 && nand4_2_0), rst_n) // dfrtp_2_14
const and4bb_2_1 = (!o211a_2_5 && !o211a_2_4 && o211a_2_2 && o211a_2_3) // and4bb_2_1
const dfrtp_2_8 = new Register(((dfrtp_2_4 || nand4_2_3) && ((I && enableGate && and4bb_2_1) || dfrtp_2_8)), rst_n) // dfrtp_2_8
const nand4_2_3 = !(I && enableGate && dfrtp_2_8 && and4bb_2_1) // nand4_2_3
const dfrtp_2_4 = new Register(!(dfrtp_2_4 && nand4_2_3), rst_n) // dfrtp_2_4
const and4bb_2_2 = (!o211a_2_3 && !o211a_2_5 && o211a_2_4 && o211a_2_2) // and4bb_2_2
const dfrtp_2_6 = new Register(((dfrtp_2_11 || nand4_2_1) && ((I && enableGate && and4bb_2_2) || dfrtp_2_6)), rst_n) // dfrtp_2_6
const nand4_2_1 = !(I && enableGate && dfrtp_2_6 && and4bb_2_2) // nand4_2_1
const dfrtp_2_11 = new Register(!(dfrtp_2_11 && nand4_2_1), rst_n) // dfrtp_2_11
const and4bb_2_3 = (!o211a_2_2 && !o211a_2_5 && o211a_2_4 && o211a_2_3) // and4bb_2_3
const dfrtp_2_5 = new Register(((dfrtp_2_12 || nand4_2_2) && ((I && enableGate && and4bb_2_3) || dfrtp_2_5)), rst_n) // dfrtp_2_5
const nand4_2_2 = !(I && enableGate && dfrtp_2_5 && and4bb_2_3) // nand4_2_2
const dfrtp_2_12 = new Register(!(dfrtp_2_12 && nand4_2_2), rst_n) // dfrtp_2_12
const and4b_2_1 = (!o211a_2_5 && o211a_2_4 && o211a_2_2 && o211a_2_3) // and4b_2_1
const nand4_2_5 = !(I && enableGate && dfrtp_2_53 && and4b_2_1) // nand4_2_5
const dfrtp_2_10 = new Register(!(dfrtp_2_10 && nand4_2_5), rst_n) // dfrtp_2_10
const dfrtp_2_53 = new Register(((dfrtp_2_10 || nand4_2_5) && ((I && enableGate && and4b_2_1) || dfrtp_2_53)), rst_n) // dfrtp_2_53
const nand2_2_15 = !(I && enableGate) // nand2_2_15
const or4b_2_2 = (o211a_2_3 || o211a_2_2 || o211a_2_5 || !o211a_2_4) // or4b_2_2
const nor2_2_16 = !(or4b_2_2 || nand2_2_15) // nor2_2_16
const dfrtp_2_7 = new Register(((dfrtp_2_7 || nor2_2_16) && (dfrtp_2_13 || !dfrtp_2_7 || or4b_2_2 || nand2_2_15)), rst_n) // dfrtp_2_7
const dfrtp_2_13 = new Register(((dfrtp_2_7 && nor2_2_16) || dfrtp_2_13), rst_n) // dfrtp_2_13
const and4bb_2_8 = (!o211a_2_2 && !o211a_2_4 && o211a_2_5 && o211a_2_3) // and4bb_2_8
const nand4_2_6 = !(I && enableGate && dfrtp_2_55 && and4bb_2_8) // nand4_2_6
const dfrtp_2_58 = new Register(!(dfrtp_2_58 && nand4_2_6), rst_n) // dfrtp_2_58
const dfrtp_2_55 = new Register(((dfrtp_2_58 || nand4_2_6) && ((I && enableGate && and4bb_2_8) || dfrtp_2_55)), rst_n) // dfrtp_2_55
const nand2_2_34 = !(I && enableGate) // nand2_2_34
const or4b_2_3 = (o211a_2_3 || o211a_2_2 || o211a_2_4 || !o211a_2_5) // or4b_2_3
const nor2_2_42 = !(or4b_2_3 || nand2_2_34) // nor2_2_42
const dfrtp_2_54 = new Register(((dfrtp_2_54 || nor2_2_42) && (dfrtp_2_52 || !dfrtp_2_54 || or4b_2_3 || nand2_2_34)), rst_n) // dfrtp_2_54
const dfrtp_2_52 = new Register(((dfrtp_2_54 && nor2_2_42) || dfrtp_2_52), rst_n) // dfrtp_2_52
const and4bb_2_7 = (!o211a_2_3 && !o211a_2_4 && o211a_2_5 && o211a_2_2) // and4bb_2_7
const nand4_2_4 = !(I && enableGate && dfrtp_2_56 && and4bb_2_7) // nand4_2_4
const dfrtp_2_59 = new Register(!(dfrtp_2_59 && nand4_2_4), rst_n) // dfrtp_2_59
const dfrtp_2_56 = new Register(((dfrtp_2_59 || nand4_2_4) && ((I && enableGate && and4bb_2_7) || dfrtp_2_56)), rst_n) // dfrtp_2_56
const highInputCounter_Bit0 = new Register(!(and3_2_9 || !((I && enableGate) || highInputCounter_Bit0)), rst_n) // highInputCounter_Bit0
const and3_2_9 = (highInputCounter_Bit0 && I && enableGate) // and3_2_9
const highInputCounter_Bit1 = new Register(((I && enableGate && (!highInputCounter_Bit1 && highInputCounter_Bit0)) || (!and3_2_9 && highInputCounter_Bit1)), rst_n) // highInputCounter_Bit1
const and3_2_11 = (highInputCounter_Bit1 && highInputCounter_Bit2 && and3_2_9) // and3_2_11
const highInputCounter_Bit2 = new Register((!and3_2_11 && ((highInputCounter_Bit1 && and3_2_9) || highInputCounter_Bit2)), rst_n) // highInputCounter_Bit2
const highInputCounter_Bit3 = new Register(((highInputCounter_Bit3 || and3_2_11) && nand2_2_24), rst_n) // highInputCounter_Bit3
const and3_2_8 = (highInputCounter_Bit1 && highInputCounter_Bit2 && highInputCounter_Bit3) // and3_2_8
const nand2_2_24 = !(and3_2_9 && and3_2_8) // nand2_2_24
const highInputCounter_Bit4 = new Register((highInputCounter_Bit4 === nand2_2_24), rst_n) // highInputCounter_Bit4
const highInputCounter_Bit5 = new Register(((!(highInputCounter_Bit4 && highInputCounter_Bit5) || nand2_2_24) && ((highInputCounter_Bit4 && and3_2_9 && and3_2_8) || highInputCounter_Bit5)), rst_n) // highInputCounter_Bit5
const and2_2_9 = (highInputCounter_Bit4 && highInputCounter_Bit5) // and2_2_9
const and4_2_4 = (highInputCounter_Bit6 && and2_2_9 && and3_2_9 && and3_2_8) // and4_2_4
const highInputCounter_Bit6 = new Register((!and4_2_4 && ((and2_2_9 && and3_2_9 && and3_2_8) || highInputCounter_Bit6)), rst_n) // highInputCounter_Bit6
const highInputCounter_Bit7 = new Register((highInputCounter_Bit7 !== and4_2_4), rst_n) // highInputCounter_Bit7
const or2_2_7 = (weirdLockRegister2 || I) // or2_2_7
const enableGate_N = !enableGate // enableGate_N
const weirdLockRegister1_N = !weirdLockRegister1 // weirdLockRegister1_N
const weirdLockRegister1 = new Register(!((weirdLockRegister1_N && nand2_2_25) || (enableGate_N ? counterIs11 : weirdLockRegister1_N)), rst_n) // weirdLockRegister1
const weirdLockRegister2 = new Register(((enableGate_N && weirdLockRegister2) || (((weirdLockRegister1 || nand2_2_25) && or2_2_7 && enableGate) && !counterIs11)), rst_n) // weirdLockRegister2
const nand2_2_25 = !(weirdLockRegister2 && I) // nand2_2_25
const failRegister2 = new Register(((counterIs11 && enableGate && (weirdLockRegister1 ? nand2_2_25 : or2_2_7)) || failRegister2), rst_n) // failRegister2
const successRegister = new Register(((!failRegister1 && (!failRegister2 && (highInputCounter_Bit1 && highInputCounter_Bit2 && highInputCounter_Bit4 && !(highInputCounter_Bit5 || highInputCounter_Bit6 || (highInputCounter_Bit0 || highInputCounter_Bit3 || highInputCounter_Bit7)))) && (!lockRegisterBuffered && lockRegister && (((!dfrtp_2_6 && dfrtp_2_11) && (dfrtp_2_13 && !dfrtp_2_7) && (!dfrtp_2_53 && dfrtp_2_10) && (!dfrtp_2_5 && dfrtp_2_12)) && ((dfrtp_2_2 && !dfrtp_2_1) && (!dfrtp_2_0 && dfrtp_2_14) && (!dfrtp_2_8 && dfrtp_2_4) && (dfrtp_2_3 && !dfrtp_2_9)) && ((!dfrtp_2_56 && dfrtp_2_59) && (dfrtp_2_52 && !dfrtp_2_54) && (!dfrtp_2_55 && dfrtp_2_58))) && (((!dfrtp_2_80 && dfrtp_2_66) && (dfrtp_2_79 && !dfrtp_2_65) && (!dfrtp_2_75 && dfrtp_2_67) && (!dfrtp_2_78 && dfrtp_2_64)) && ((dfrtp_2_61 && !dfrtp_2_76) && (!dfrtp_2_60 && dfrtp_2_57) && (!dfrtp_2_71 && dfrtp_2_63) && (dfrtp_2_77 && !dfrtp_2_62)) && ((!dfrtp_2_74 && dfrtp_2_70) && (io8Twice && !io8NotTwice) && (!dfrtp_2_73 && dfrtp_2_68))))) || (undefined && !(lockRegisterBuffered && lockRegister))), rst_n) // successRegister
const success = input({success: successRegister}) // success