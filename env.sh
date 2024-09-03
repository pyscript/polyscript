#!/usr/bin/env sh

# to use this env type either:
# . env.sh
# or
# source env.sh

python -m venv env
source env/bin/activate
pip install --upgrade pip
pip install --ignore-requires-python python-minifier
pip install setuptools
