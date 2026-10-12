# Loaded by the Podfile. Keep this out of the Podfile DSL so `File` means
# Ruby's File, not Pod::Podfile::File.
# Homebrew CocoaPods on Ruby 3.2+ removed File.exists? / Dir.exists?.
unless ::File.respond_to?(:exists?)
  class << ::File
    alias_method :exists?, :exist?
  end
end
unless ::Dir.respond_to?(:exists?)
  class << ::Dir
    alias_method :exists?, :exist?
  end
end
