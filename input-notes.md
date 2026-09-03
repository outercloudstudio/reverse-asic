# Input Notes

Seems to be 10, 12bit inputs.
Shift register is 12 bits long.

11x11 input

## Fail Conditions
- I && counter != 10 && input9
- I && input10 // No trues may be directly on top of each other
- I && counter != 0 && input0
- I && counter != 0 && input11

Exactly 22 inputs must be true for success

exactly two trues per column
exactly two trues per row

## Constraint Set 2
### Register 1 (55)
09, 06
10, 06
09, 07
10, 07
09, 08
10, 08

### Register 2 (56)
10, 00
10, 01
10, 02
07, 03
10, 03
05, 04
06, 04
07, 04
08, 04
09, 04
10, 04
07, 05
07, 06
07, 07
04, 08
05, 08
06, 08
07, 08
05, 09
06, 09
07, 09
04, 10
05, 10
06, 10
07, 10
08, 10
09, 10
10, 10

### Register 3 (54)
05, 00
06, 00
05, 01
03, 02
04, 02
05, 02
06, 02
03, 03
03, 04
03, 05
00, 06
01, 06
02, 06
03, 06
04, 06
05, 06
00, 07
00, 08
00, 09
01, 09
00, 10

## Register 4 (6)
07, 00
06, 01
07, 01
07, 02
08, 02
08, 03
09, 03

## Register 5 (7)
08, 00
09, 00
08, 01
09, 01
09, 02

## Register 6 (53)
01, 07
02, 07
03, 07
01, 08
02, 08
02, 09
01, 10
02, 10

## Register 7 (5)
00, 00
01, 00
02, 00
03, 00
04, 00
00, 01
01, 01
03, 01
04, 01
00, 02
01, 02
00, 03
01, 03
01, 04

## Register 8 (1)
04, 03
05, 03
06, 03
04, 04
04, 05
05, 05
06, 05
06, 06
04, 07
05, 07
06, 07

## Register 9 (0)
02, 01
02, 02
02, 03
00, 04
02, 04
00, 05
01, 05
02, 05

## Register 10 (8)
03, 08
03, 09
04, 09
03, 10

## Register 11 (9)
08, 05
09, 05
10, 05
08, 06
08, 07
08, 08
08, 09
09, 09
10, 09