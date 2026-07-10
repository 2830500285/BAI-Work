# BAI Code official wheels

Source:
- https://docs.b.ai/baicode/BAI-code-introduction/#installation
- https://raw.githubusercontent.com/BAI-labs/BAI-tools/refs/heads/main/scripts/baicode_install.sh
- https://raw.githubusercontent.com/BAI-labs/BAI-tools/refs/heads/main/scripts/baicode_install.ps1
- https://download.bankofai.io/download/baicode_release_whls.txt

BAI's official installer model requires Python 3.10-3.13 and installs the
matching BAI Code wheel with pip. BAI does not currently publish a standalone
desktop runtime binary in the official documentation.

This directory contains the official BAI Code 0.9.1 wheels for:
- macOS arm64, Python cp310-cp313
- Windows win_amd64, Python cp310-cp313

Each platform wheelhouse also includes the transitive wheels required for a
fully offline install. The Windows wheelhouses include `colorama==0.4.6`, from
https://pypi.org/project/colorama/0.4.6/, because `tqdm` requires it on Windows.

BAI Work uses these wheels to create an app-local virtual environment under the
BAI Work data directory when a system `baicode` command is not already
available.
