# https://docs.brew.sh/Node-for-Formula-Authors

require "language/node"

class Scuttleshell < Formula
  desc "A system tray app for running Secure Scuttlebutt and providing sbot features to your local system"
  homepage "https://github.com/ssbc/scuttle-shell"
  url "https://registry.npmjs.org/scuttle-shell/-/scuttle-shell-1.0.0.tgz"
  version '1.0.0'
  sha256 "0aa6369f89c8c6b8510ee138ead11209da78f667cfdd98c885df7e9bcc84ae74"

  depends_on "node@10"
  depends_on "python" => :build

  def install
    system "npm", "install", *Language::Node.std_npm_install_args(libexec)
    bin.install_symlink Dir["#{libexec}/bin/*"]
  end

  test do
    system "scuttleshell"
  end
end
