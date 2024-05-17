from uio import StringIO
import sys

class Response:
    def __init__(self, f):
        self.raw = f
        self.encoding = "utf-8"
        self._cached = None

    def close(self):
        if self.raw:
            self.raw.close()
            self.raw = None
        self._cached = None

    @property
    def content(self):
        if self._cached is None:
            try:
                self._cached = self.raw.read()
            finally:
                self.raw.close()
                self.raw = None
        return self._cached

    @property
    def text(self):
        return str(self.content, self.encoding)

    def json(self):
        import ujson

        return ujson.loads(self.content)


# TODO try to support streaming xhr requests, a-la pyodide-http
HEADERS_TO_IGNORE = ("user-agent",)


try:
    import js
except Exception as err:
    raise OSError("This version of urequests can only be used in the browser")

# TODO try to support streaming xhr requests, a-la pyodide-http

HEADERS_TO_IGNORE = ("user-agent",)


def request(
    method,
    url,
    data=None,
    json=None,
    headers={},
    stream=None,
    auth=None,
    timeout=None,
    parse_headers=True,
):
    from js import XMLHttpRequest

    xhr = XMLHttpRequest.new()
    xhr.withCredentials = False

    if auth is not None:
        import ubinascii

        username, password = auth
        xhr.open(method, url, False, username, password)
    else:
        xhr.open(method, url, False)

    for name, value in headers.items():
        if name.lower() not in HEADERS_TO_IGNORE:
            xhr.setRequestHeader(name, value)

    if timeout:
        xhr.timeout = int(timeout * 1000)

    if json is not None:
        assert data is None
        import ujson

        data = ujson.dumps(json)
        # s.write(b"Content-Type: application/json\r\n")
        xhr.setRequestHeader("Content-Type", "application/json")

    xhr.send(data)

    # Emulates the construction process in the original urequests
    resp = Response(StringIO(xhr.responseText))
    resp.status_code = xhr.status
    resp.reason = xhr.statusText
    resp.headers = xhr.getAllResponseHeaders()

    return resp


# Other methods - head, post, put, patch, delete - are not used by
# mip and therefore not included


def get(url, **kw):
    return request("GET", url, **kw)


# Content below this line is from the Micropython MIP package and is covered
# by the applicable MIT license:
# 
# THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING 
# FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER 
# DEALINGS IN THE SOFTWARE.

# MicroPython package installer
# MIT license; Copyright (c) 2022 Jim Mussared


_PACKAGE_INDEX = const("https://micropython.org/pi/v2")
_CHUNK_SIZE = 128


# This implements os.makedirs(os.dirname(path))
def _ensure_path_exists(path):
    import os

    split = path.split("/")

    # Handle paths starting with "/".
    if not split[0]:
        split.pop(0)
        split[0] = "/" + split[0]

    prefix = ""
    for i in range(len(split) - 1):
        prefix += split[i]
        try:
            os.stat(prefix)
        except:
            os.mkdir(prefix)
        prefix += "/"


# Copy from src (stream) to dest (function-taking-bytes)
def _chunk(src, dest):
    buf = memoryview(bytearray(_CHUNK_SIZE))
    while True:
        n = src.readinto(buf)
        if n == 0:
            break
        dest(buf if n == _CHUNK_SIZE else buf[:n])


# Check if the specified path exists and matches the hash.
def _check_exists(path, short_hash):
    import os

    try:
        import binascii
        import hashlib

        with open(path, "rb") as f:
            hs256 = hashlib.sha256()
            _chunk(f, hs256.update)
            existing_hash = str(binascii.hexlify(hs256.digest())[: len(short_hash)], "utf-8")
            return existing_hash == short_hash
    except:
        return False


def _rewrite_url(url, branch=None):
    if not branch:
        branch = "HEAD"
    if url.startswith("github:"):
        url = url[7:].split("/")
        url = (
            "https://raw.githubusercontent.com/"
            + url[0]
            + "/"
            + url[1]
            + "/"
            + branch
            + "/"
            + "/".join(url[2:])
        )
    return url


def _download_file(url, dest):
    response = get(url)
    try:
        if response.status_code != 200:
            print("Error", response.status_code, "requesting", url)
            return False

        print("Copying:", dest)
        _ensure_path_exists(dest)
        with open(dest, "wb") as f:
            _chunk(response.raw, f.write)

        return True
    finally:
        response.close()


def _install_json(package_json_url, index, target, version, mpy):
    response = get(_rewrite_url(package_json_url, version))
    try:
        if response.status_code != 200:
            print("Package not found:", package_json_url)
            return False

        package_json = response.json()
    finally:
        response.close()
    for target_path, short_hash in package_json.get("hashes", ()):
        fs_target_path = target + "/" + target_path
        if _check_exists(fs_target_path, short_hash):
            print("Exists:", fs_target_path)
        else:
            file_url = "{}/file/{}/{}".format(index, short_hash[:2], short_hash)
            if not _download_file(file_url, fs_target_path):
                print("File not found: {} {}".format(target_path, short_hash))
                return False
    for target_path, url in package_json.get("urls", ()):
        fs_target_path = target + "/" + target_path
        if not _download_file(_rewrite_url(url, version), fs_target_path):
            print("File not found: {} {}".format(target_path, url))
            return False
    for dep, dep_version in package_json.get("deps", ()):
        if not _install_package(dep, index, target, dep_version, mpy):
            return False
    return True


def _install_package(package, index, target, version, mpy):
    if (
        package.startswith("http://")
        or package.startswith("https://")
        or package.startswith("github:")
    ):
        if package.endswith(".py") or package.endswith(".mpy"):
            print("Downloading {} to {}".format(package, target))
            return _download_file(
                _rewrite_url(package, version), target + "/" + package.rsplit("/")[-1]
            )
        else:
            if not package.endswith(".json"):
                if not package.endswith("/"):
                    package += "/"
                package += "package.json"
            print("Installing {} to {}".format(package, target))
    else:
        if not version:
            version = "latest"
        print("Installing {} ({}) from {} to {}".format(package, version, index, target))

        mpy_version = (
            sys.implementation._mpy & 0xFF if mpy and hasattr(sys.implementation, "_mpy") else "py"
        )

        # WARNING: mpy_version fails miserably with 1.22.0-380
        package = "{}/package/{}/{}/{}.json".format(index, "py", package, version)

    return _install_json(package, index, target, version, mpy)


def install(package, index=None, target=None, version=None, mpy=True):
    if not target:
        for p in sys.path:
            if p.endswith("/lib"):
                target = p
                break
        else:
            print("Unable to find lib dir in sys.path")
            return

    if not index:
        index = _PACKAGE_INDEX

    if _install_package(package, index.rstrip("/"), target, version, mpy):
        print("Done")
    else:
        print("Package may be partially installed")
