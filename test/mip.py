# Test a variety of ways that the mip tool can import content
# Based on documentation at https://docs.micropython.org/en/latest/reference/packages.html

import mip

# Install default version from micropython-lib
mip.install('keyword')
import keyword
print('The keyword list is', keyword.kwlist)

mip.install('https://raw.githubusercontent.com/micropython/micropython-lib/master/python-stdlib/bisect/bisect.py')
from bisect import insort_right
my_list = [1,2,4]
insort_right(my_list, 3)
print(f'My list with insertion is {my_list}')

# Install from GitHub shortcut
mip.install("github:micropython/micropython-lib/python-stdlib/curses.ascii/curses/ascii.py")
import ascii
print(f'{ascii.isalpha("A")=}')
print(f'{ascii.ispunct("Q")=}')
