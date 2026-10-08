"""Extract the single inline application script for offline VM tests."""

from html.parser import HTMLParser
import json
import sys


class InlineScriptParser(HTMLParser):
    """Use HTML raw-text parsing so tags in comments or strings are not selectors."""

    def __init__(self):
        super().__init__()
        self.scripts = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "script" and not any(name == "src" for name, _ in attrs):
            self.current = []

    def handle_data(self, data):
        if self.current is not None:
            self.current.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.current is not None:
            self.scripts.append("".join(self.current))
            self.current = None


def extract_inline_script(text):
    """Fail clearly if the fixture stops containing exactly one complete script."""
    parser = InlineScriptParser()
    parser.feed(text)
    parser.close()
    if parser.current is not None or len(parser.scripts) != 1:
        raise ValueError("expected exactly one complete inline script")
    return parser.scripts[0]


if __name__ == "__main__":
    print(json.dumps(extract_inline_script(sys.stdin.read())))
