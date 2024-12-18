---
title: SystemVerilog Assertion Synthesis
date: 2024-12-18 14:25:00
tags:
  - ieee1800
---
In verific, SVA is implemented as a parse tree manipulation utility. This utility will take an analyzed and statically elaborated parse tree of a module or library as input and will replace all convertible concurrent assertions with always blocks and variable declarations. For each concurrent assertion an always block will be created. The concurrent assertion along with its action block will be converted to an equivalent immediate assertion and that immediate assertion will be part of the always block statement along with other shift register implementations. The user can pretty-print the converted parse tree to a file and simulate to verify the correctness of synthesis. If sysnthesis of SVA is not possible for any reason, the parse tree will remain as it was. This conversion is based on assertion syntax and semantic defined in IEEE std 1800 SystemVerilog LRM.

## Checkers for match and fail
If the assertion in the design has an 'if' block we synthesize the checker to identify the match of the property. On the other hand if the 'else' block is present then we create the checker to identify the fail of the property. If no action block is present we create a checker to catch fail of the property (default action). If both blocks are present separate checkers for match and fail are created. 

The signal FM_OUT_match is asserted if the checker for the match is created, the signal FM_OUT_fail is asserted if the checker for fail is created. Please note the signals FM_OUT_match/ FM_OUT_fail are asserted when the property match/fail.

## Restrictions
1. Property and sequence instances are not supported
2. Use of parameterized expressions or complex expressions are not supported where constant expression is required. Only constant literals are allowed for now. For example: `a ##[p:q] b` will not be supported, but `a ##[1:2] b` will be supported. To allow all kinds of constant expressions, user needs to first statically elaborate the design with compile flag `VERILOG_REPLACE_CONST_EXPRS` on  and then apply this utility.
3. Concurrent assertions present in sequential area i.e inside always block are not synthesized.
4. sequence expressions containing infinite bound($) is not supported yet
5. Assertions under multiple clocks are not supported.

## example
```verilog
module test (input in1, in2, clock);
  L: assert property(@ (posedge clock) (in1 ##3 in2))
          $display($time,,,"Expression is matching");
endmodule

/// -> 
module test (input in1, in2, clock) ;
 generate
   bit [2:-1] in1_shifted ;  /* verific VERIFIC_SVA_FF=1 */ 
   bit [-1:-1] in2_shifted ;  /* verific VERIFIC_SVA_FF=1 */ 
   bit FM_OUT_match ;  /* verific VERIFIC_SVA_FF=1 */ 
   parameter fm_arr_match = 0 ; 
   bit [3:0] FM_ARR_match, FM_ARR_tmp_match ; 
   if (fm_arr_match) 
   begin
     always @(posedge clock)
     begin
       FM_ARR_match <=  (FM_ARR_tmp_match << 1) ;
     end
   end
   always @(posedge clock)
   begin
     in1_shifted[2:0]<={in1_shifted[1:0],((|in1) == 1'b1)} ;
     L_0 : assert (FM_OUT_match) 
              $display ($time,,,"Expression is matching") ;
   end
   always @(*)
   begin
     parameter fm_yes = 1 ; 
     bit [3:0][3:0] and_oprnd [1] ; 
     bit [3:0][3:0] or_oprnd ; 
     int i ; 
     in1_shifted[-1] = ((|in1) == 1'b1) ;
     in2_shifted[-1] = ((|in2) == 1'b1) ;
     for (i = 0 ; (i < (fm_yes ? 1 : 1)) ; i++ )
        and_oprnd[0][3][i] = (in1_shifted[(2 + i)] & in2_shifted[(-1 + i)]) ;
     for (i = 0 ; (i < (fm_yes ? 4 : 1)) ; i++ )
        or_oprnd[0][i] = and_oprnd[0][0][i] ;
     for (i = 0 ; (i < (fm_yes ? 3 : 1)) ; i++ )
        or_oprnd[1][i] = and_oprnd[0][1][i] ;
     for (i = 0 ; (i < (fm_yes ? 2 : 1)) ; i++ )
        or_oprnd[2][i] = and_oprnd[0][2][i] ;
     for (i = 0 ; (i < (fm_yes ? 1 : 1)) ; i++ )
        or_oprnd[3][i] = and_oprnd[0][3][i] ;
     FM_OUT_match = 0 ;
              
     
     if (fm_yes) 
     begin
       if (fm_arr_match) 
       begin
         for (i = 0 ; (i <= 3) ; i++ )
            FM_ARR_tmp_match[i] = (or_oprnd[i][0] || FM_ARR_match[i]) ;
         for (i = 0 ; (i <= 3) ; i++ )
            FM_OUT_match |= (or_oprnd[i][0] && (!FM_ARR_match[i])) ;
       end
       else
       begin
         for (i = 0 ; (i <= 3) ; i++ )
            if ((i == 0)) 
            begin
              FM_OUT_match = or_oprnd[i][0] ;
            end
            else
            begin
              bit [3:0] tmp ; 
              int j, k ; 
              tmp = or_oprnd[i][0] ;
              for (j=i,k=1;(j>0);j--)
              begin
                tmp&=(!or_oprnd[(i-k)][k]);
                k++  ;
              end
              FM_OUT_match |= tmp ;
            end
        end
      end
      else
        begin
          for (i = 0 ; (i <= 3) ; i++ )
             FM_OUT_match |= or_oprnd[i][0] ;
        end
   end
 endgenerate
endmodule
```

```verilog 
module test (input in1, in2, g1, clock);
   L: assert property(@ (posedge clock) (in1 ##[1:2] in2) |-> (g1[*1:2]))
   $display($time,,,"Expression is matching");
endmodule

/// -> 
module test (
  input in1, in2, clock) ;
  generate
     bit [3:-1] in1_shifted ;  /* verific VERIFIC_SVA_FF=1 */ 
     bit [-1:-1] in2_shifted ;  /* verific VERIFIC_SVA_FF=1 */ 
     bit FM_OUT_match ;  /* verific VERIFIC_SVA_FF=1 */ 
     parameter fm_arr_match = 0 ; 
     bit [4:0] FM_ARR_match, FM_ARR_tmp_match ; 
     if (fm_arr_match) 
     begin          
        always @(posedge clock)
        begin
           FM_ARR_match <=  (FM_ARR_tmp_match << 1) ;
        end
     end
     always @(posedge clock)
     begin
        in1_shifted[3:0] <=  {in1_shifted[2:0],((|in1) == 1'b1)} ;
        L_0 : assert (FM_OUT_match) 
        $display ($time,,,"Expression is matching") ;
     end
     always @(*)
     begin
        parameter fm_yes = 1 ; 
        bit [4:0][4:0] and_oprnd [1] ; 
        bit [4:0][4:0] or_oprnd ; 
        int i ; 
        in1_shifted[-1] = ((|in1) == 1'b1) ;
        in2_shifted[-1] = ((|in2) == 1'b1) ;
        for (i = 0 ; (i < (fm_yes ? 1 : 1)) ; i ++ )
           and_oprnd[0][4][i] = (in1_shifted[(3 + i)] & in2_shifted[(-1 + i)]) ;
        for (i = 0 ; (i < (fm_yes ? 5 : 1)) ; i ++ )
           or_oprnd[0][i] = and_oprnd[0][0][i] ;
        for (i = 0 ; (i < (fm_yes ? 4 : 1)) ; i ++ )
           or_oprnd[1][i] = and_oprnd[0][1][i] ;
        for (i = 0 ; (i < (fm_yes ? 3 : 1)) ; i ++ )
           or_oprnd[2][i] = and_oprnd[0][2][i] ;
        for (i = 0 ; (i < (fm_yes ? 2 : 1)) ; i ++ )
           or_oprnd[3][i] = and_oprnd[0][3][i] ;
        for (i = 0 ; (i < (fm_yes ? 1 : 1)) ; i ++ )
           or_oprnd[4][i] = and_oprnd[0][4][i] ;
        FM_OUT_match = 0 ;
        if (fm_yes) 
        begin
           if (fm_arr_match) 
           begin
              for (i = 0 ; (i <= 4) ; i ++ )
                 FM_ARR_tmp_match[i] = (or_oprnd[i][0] || FM_ARR_match[i]) ;
              for (i = 0 ; (i <= 4) ; i ++ )
                 FM_OUT_match |= (or_oprnd[i][0] && (!FM_ARR_match[i])) ;
           end
           else
           begin
              for (i = 0 ; (i <= 4) ; i ++ )
              if ((i == 0)) 
              begin
                 FM_OUT_match = or_oprnd[i][0] ;
              end
              else
              begin
                 bit [4:0] tmp ; 
                 int j, k ; 
                 tmp = or_oprnd[i][0] ;
                 for (j = i, k = 1 ; (j > 0) ; j -- )
                 begin
                    tmp &= (!or_oprnd[(i - k)][k]) ;
                    k ++  ;
                 end
                 FM_OUT_match |= tmp ;
              end
           end
        end
        else
        begin
           for (i = 0 ; (i <= 4) ; i ++ )
              FM_OUT_match |= or_oprnd[i][0] ;
        end
     end
  endgenerate
endmodule
```