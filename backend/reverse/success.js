const highInputIs22 = (highInputCounter_Bit1 && highInputCounter_Bit2) &&
  (highInputCounter_Bit4 &&
    !((highInputCounter_Bit5 || highInputCounter_Bit6) ||
      ((highInputCounter_Bit0 || highInputCounter_Bit3) ||
        highInputCounter_Bit7)));

const successRegister = !failRegister1 && !failRegister2 && highInputIs22 &&
  !lockRegisterBuffered && lockRegister &&
  !dfrtp_2_6 && dfrtp_2_11 &&
  dfrtp_2_13 && !dfrtp_2_7 &&
  !dfrtp_2_53 && dfrtp_2_10 &&
  !dfrtp_2_5 && dfrtp_2_12 &&
  dfrtp_2_2 && !dfrtp_2_1 &&
  !dfrtp_2_0 && dfrtp_2_14 &&
  !dfrtp_2_8 && dfrtp_2_4 &&
  dfrtp_2_3 && !dfrtp_2_9 &&
  !dfrtp_2_56 && dfrtp_2_59 &&
  dfrtp_2_52 && !dfrtp_2_54 &&
  !dfrtp_2_55 && dfrtp_2_58 &&
  !dfrtp_2_80 && dfrtp_2_66 &&
  dfrtp_2_79 && !dfrtp_2_65 &&
  !dfrtp_2_75 && dfrtp_2_67 &&
  !dfrtp_2_78 && dfrtp_2_64 &&
  dfrtp_2_61 && !dfrtp_2_76 &&
  !dfrtp_2_60 && dfrtp_2_57 &&
  !dfrtp_2_71 && dfrtp_2_63 &&
  dfrtp_2_77 && !dfrtp_2_62 &&
  !dfrtp_2_74 && dfrtp_2_70 &&
  io8Twice && !io8NotTwice &&
  !dfrtp_2_73 && dfrtp_2_68;

const counterIs10 = (!counter_Bit0 && !counter_Bit2) && (counter_Bit3 && counter_Bit1)

const weirdLockRegister1 = new Register(
  !((!weirdLockRegister1 && !(weirdLockRegister2 && I)) ||
    (!(!lockRegister && enable)
      ? counterIs10
      : !weirdLockRegister1)),
  rst_n,
); // weirdLockRegister1
const weirdLockRegister2 = new Register(
  (!(!lockRegister && enable) && weirdLockRegister2) ||
  ((((weirdLockRegister1 || !(weirdLockRegister2 && I)) &&
    (weirdLockRegister2 || I)) && (!lockRegister && enable)) &&
    !counterIs10),
  rst_n,
); // weirdLockRegister2

const failRegister2Conditon = counterIs10 && (
	weirdLockRegister1
      ? !(weirdLockRegister2 && I)
      : (weirdLockRegister2 || I)
)

// const failRegister2 = new Register(
//   (counterIs10 && failRegister2Conditon) || failRegister2,
//   rst_n,
// );
