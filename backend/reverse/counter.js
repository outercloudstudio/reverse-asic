const counter_Bit0 = new Register(!(counterIs11 || (counter_Bit0 === enableGate)), rst_n) // counter_Bit0
const and3_2_14 = (counter_Bit1 && counter_Bit0 && enableGate) // and3_2_14
const counter_Bit1 = new Register(!((enableGate && counterIs11) || !((counter_Bit0 && enableGate) || counter_Bit1) || and3_2_14), rst_n) // counter_Bit1
const counter_Bit2 = new Register((counter_Bit2 !== and3_2_14), rst_n) // counter_Bit2
const counter_Bit3 = new Register(!((enableGate && counterIs11) || ((counter_Bit1 && counter_Bit0 && counter_Bit2 && enableGate) && counter_Bit3) || !((counter_Bit1 && counter_Bit0 && counter_Bit2 && enableGate) || counter_Bit3)), rst_n) // counter_Bit3
const counterIs11 = (!counter_Bit0 && !counter_Bit2 && counter_Bit3 && counter_Bit1) // counterIs11

const and4_2_2 = (counterIs11 && enableGate && counter2_Bit1 && counter2_Bit0) // and4_2_2
const nand2_2_23 = !(counterIs11 && enableGate) // nand2_2_23
const counter2_Bit1 = new Register(((lockBitComp2 || nand2_2_23) && ((counterIs11 && enableGate && counter2_Bit0) || counter2_Bit1) && !and4_2_2), rst_n) // counter2_Bit1
const lockCounterRegister_BitUNKNOWN_5 = new Register((lockCounterRegister_BitUNKNOWN_5 !== and4_2_2), rst_n) // lockCounterRegister_BitUNKNOWN_5
const counter2_Bit2 = new Register(((counter2_Bit0 || lockBitComp2 || nand2_2_23) && !(lockCounterRegister_BitUNKNOWN_5 && counter2_Bit2 && and4_2_2) && ((lockCounterRegister_BitUNKNOWN_5 && and4_2_2) || counter2_Bit2)), rst_n) // counter2_Bit2
const lockBitComp2 = !(!lockCounterRegister_BitUNKNOWN_5 && counter2_Bit2 && counter2_Bit1) // lockBitComp2
const counter2_Bit0 = new Register((counter2_Bit0 ? (counterIs11 && enableGate && lockBitComp2) : nand2_2_23), rst_n) // counter2_Bit0
const lockRegister = new Register(((counterIs11 && !(counter2_Bit0 || lockBitComp2) && enableGate) || lockRegister), rst_n) // lockRegister
const enableGate = (!lockRegister && enable) // enableGate

const successRegister = new Register(
	(
		(
			!failRegister1
			&& (
				!failRegister2
				&&
				(highInputCounter_Bit1 && highInputCounter_Bit2 && highInputCounter_Bit4 && !(highInputCounter_Bit5 || highInputCounter_Bit6 || (highInputCounter_Bit0 || highInputCounter_Bit3 || highInputCounter_Bit7))))
			&& (
				!lockRegisterBuffered
				&&
				lockRegister
				&& (
					(!dfrtp_2_6 && dfrtp_2_11)
					&& (dfrtp_2_13 && inv_2_2)
					&& (!dfrtp_2_53 && dfrtp_2_10)
					&& (!dfrtp_2_5 && dfrtp_2_12)
					&& (dfrtp_2_2 && inv_2_1)
					&& (!dfrtp_2_0 && dfrtp_2_14)
					&& (!dfrtp_2_8 && dfrtp_2_4)
					&& (dfrtp_2_3 && inv_2_3)
					&& (!dfrtp_2_56 && dfrtp_2_59)
					&& (dfrtp_2_52 && inv_2_16)
					&& (!dfrtp_2_55 && dfrtp_2_58)
				)
				&& (
					(!dfrtp_2_80 && dfrtp_2_66)
					&& (dfrtp_2_79 && inv_2_19)
					&& (!dfrtp_2_75 && dfrtp_2_67)
					&& (!dfrtp_2_78 && dfrtp_2_64)
					&& (dfrtp_2_61 && inv_2_17)
					&& (!dfrtp_2_60 && dfrtp_2_57)
					&& (!dfrtp_2_71 && dfrtp_2_63)
					&& (dfrtp_2_77 && inv_2_18)
					&& ((!dfrtp_2_74 && dfrtp_2_70)
					&& (dfrtp_2_69 && inv_2_20)
					&& (!dfrtp_2_73 && dfrtp_2_68))
				)
			)
		)
		|| (undefined && !(lockRegisterBuffered && lockRegister))
	), 
	rst_n
) // successRegister


// (!dfrtp_2_6 && dfrtp_2_11)
// && (dfrtp_2_13 && !dfrtp_2_7)
// && (!dfrtp_2_53 && dfrtp_2_10)
// && (!dfrtp_2_5 && dfrtp_2_12)
// && ((dfrtp_2_2 && !dfrtp_2_1)
// && (!dfrtp_2_0 && dfrtp_2_14)
// && (!dfrtp_2_8 && dfrtp_2_4)
// && (dfrtp_2_3 && !dfrtp_2_9)
// && (!dfrtp_2_56 && dfrtp_2_59)
// && (dfrtp_2_52 && !dfrtp_2_54)
// && (!dfrtp_2_55 && dfrtp_2_58)
// && (!dfrtp_2_80 && dfrtp_2_66)
// && (dfrtp_2_79 && !dfrtp_2_65)
// && (!dfrtp_2_75 && dfrtp_2_67)
// && (!dfrtp_2_78 && dfrtp_2_64)
// && (dfrtp_2_61 && !dfrtp_2_76)
// && (!dfrtp_2_60 && dfrtp_2_57)
// && (!dfrtp_2_71 && dfrtp_2_63)
// && (dfrtp_2_77 && !dfrtp_2_62)
// && (!dfrtp_2_74 && dfrtp_2_70)
// && (dfrtp_2_69 && !dfrtp_2_72)
// && (!dfrtp_2_73 && dfrtp_2_68)


// const io = I && enableGate
// const counter3_Bit0 = new Register(counter3_Bit0 !== io, rst_n) // counter3_5

// const counter3_Bit1 = new Register(((io && !counter3_Bit1 && counter3_Bit0) || ((!counter3_Bit0 || !io) && counter3_Bit1)), rst_n) // counter3_0
// // counter 0 ?
// // 0
// // io && counter5

// // 1
// // !io || !counter5

// const and3_2_11 = (counter3_Bit1 && counter3_Bit2 && (counter3_Bit0 && io)) // and3_2_11
// const counter3_Bit2 = new Register((!and3_2_11 && ((counter3_Bit1 && (counter3_Bit0 && io)) || counter3_Bit2)), rst_n) // counter3_1
// const counter3_Bit3 = new Register(((counter3_Bit3 || and3_2_11) && nand2_2_24), rst_n) // counter3_6
// const and3_2_8 = (counter3_Bit1 && counter3_Bit2 && counter3_Bit3) // and3_2_8
// const nand2_2_24 = !((counter3_Bit0 && io) && and3_2_8) // nand2_2_24
// const counter3_2 = new Register((counter3_2 === nand2_2_24), rst_n) // counter3_2
// const and2_2_9 = (counter3_2 && counter3_3) // and2_2_9
// const and4_2_4 = (counter3_4 && and2_2_9 && (counter3_Bit0 && io) && and3_2_8) // and4_2_4
// const counter3_3 = new Register(((!(counter3_2 && counter3_3) || nand2_2_24) && ((counter3_2 && (counter3_Bit0 && io) && and3_2_8) || counter3_3)), rst_n) // counter3_3
// const counter3_4 = new Register((!and4_2_4 && ((and2_2_9 && (counter3_Bit0 && io) && and3_2_8) || counter3_4)), rst_n) // counter3_4
// const counter3_7 = new Register((counter3_7 !== and4_2_4), rst_n) // counter3_7


const complexFail1 = new Register(((complexFail1 || (counter_Is8 && io)) && (complexSuccess1 || !complexFail1 || counterCheck1_not8 || ioLow)), rst_n) // complexFail1

const complexSuccess1 = new Register(((complexFail1 && (counter_Is8 && io)) || complexSuccess1), rst_n) // complexSuccess1


const dfrtp_2_68 = new Register(!(dfrtp_2_68 && !(io && dfrtp_2_73 && counterIs10)), rst_n) // dfrtp_2_68
const dfrtp_2_73 = new Register(((dfrtp_2_68 || !(io && dfrtp_2_73 && counterIs10)) && ((io && counterIs10) || dfrtp_2_73)), rst_n) // dfrtp_2_73

const counter3_Bit0 = new Register(!(and3_2_9 || !((I && enableGate) || counter3_Bit0)), rst_n) // counter3_Bit0
const and3_2_9 = (counter3_Bit0 && I && enableGate) // and3_2_9

const counter3_Bit1 = new Register(((I && enableGate && (!counter3_Bit1 && counter3_Bit0)) || (!and3_2_9 && counter3_Bit1)), rst_n) // counter3_Bit1

const counter3_Bit2 = new Register((!and3_2_11 && ((counter3_Bit1 && and3_2_9) || counter3_Bit2)), rst_n) // counter3_Bit2
const and3_2_11 = (counter3_Bit1 && counter3_Bit2 && and3_2_9) // and3_2_11

const counter3_Bit3 = new Register(((counter3_Bit3 || and3_2_11) && nand2_2_24), rst_n) // counter3_Bit3
const and3_2_8 = (counter3_Bit1 && counter3_Bit2 && counter3_Bit3) // and3_2_8
const nand2_2_24 = !(and3_2_9 && and3_2_8) // nand2_2_24

const counter3_Bit4 = new Register((counter3_Bit4 === nand2_2_24), rst_n) // counter3_Bit4

const counter3_3 = new Register(((!(counter3_Bit4 && counter3_3) || nand2_2_24) && ((counter3_Bit4 && and3_2_9 && and3_2_8) || counter3_3)), rst_n) // counter3_3

const counter3_4 = new Register((!and4_2_4 && ((and2_2_9 && and3_2_9 && and3_2_8) || counter3_4)), rst_n) // counter3_4
const and2_2_9 = (counter3_Bit4 && counter3_3) // and2_2_9
const and4_2_4 = (counter3_4 && and2_2_9 && and3_2_9 && and3_2_8) // and4_2_4

const counter3_7 = new Register((counter3_7 !== and4_2_4), rst_n) // counter3_7