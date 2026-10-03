"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { SELECTED_MEMBER_ID_KEY } from "@/lib/member-storage";

interface Member {
  id: string;
  name: string;
  color: string;
}

export default function SelectMemberPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/members")
      .then((response) => response.json())
      .then((data: Member[]) => setMembers(data))
      .finally(() => setLoading(false));
  }, []);

  const selectMember = (memberId: string) => {
    const searchParams = new URLSearchParams(window.location.search);
    const next = searchParams.get("next");
    const nextPath = next?.startsWith("/") ? next : "/transactions/new";
    localStorage.setItem(SELECTED_MEMBER_ID_KEY, memberId);
    router.replace(nextPath);
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md items-center">
      <Card className="w-full">
        <CardContent className="space-y-5 p-5">
          <div>
            <p className="text-xs font-semibold text-[#6b7280]">アカウント</p>
            <h1 className="text-xl font-bold text-[#1f2937]">使うアカウントを選択</h1>
          </div>
          {loading ? (
            <LoadingSpinner className="py-10" />
          ) : members.length === 0 ? (
            <p className="py-10 text-center text-sm text-[#9ca3af]">アカウントがありません</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => selectMember(member.id)}
                  className="flex flex-col items-center gap-2 rounded-[10px] border border-[#e5e7eb] bg-white p-4 text-center"
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold"
                    style={{ backgroundColor: `${member.color}22`, color: member.color }}
                  >
                    {member.name.charAt(0)}
                  </span>
                  <span className="text-sm font-bold text-[#1f2937]">{member.name}</span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
