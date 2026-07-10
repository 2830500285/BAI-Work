import sys

from baicode.cli import main


if __name__ == "__main__":
    sys.argv[0] = sys.argv[0].removesuffix(".exe")
    raise SystemExit(main())
